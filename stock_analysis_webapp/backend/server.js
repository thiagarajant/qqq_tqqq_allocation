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
        thresholds: [2, 5, 10, 15, 20],
        default: 10,
        description: 'Available drawdown percentage thresholds for cycle analysis'
    });
});

// Get cycles for specific threshold
app.get('/api/cycles/:threshold', (req, res) => {
    const threshold = parseInt(req.params.threshold);
    
    if (![2, 5, 10, 15, 20].includes(threshold)) {
        return res.status(400).json({ 
            error: 'Invalid threshold. Must be one of: 2, 5, 10, 15, 20' 
        });
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

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        // Process the data to identify complete cycles
        const cycles = processCycles(rows, threshold);
        
        res.json({
            threshold: threshold,
            totalCycles: cycles.length,
            cycles: cycles,
            dataPoints: rows.length
        });
    });
});

// Process raw data into cycles
function processCycles(rows, threshold) {
    const cycles = [];
    let currentATH = null;
    let currentATHDate = null;
    let currentATHIndex = null;
    let cycleNumber = 1;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        if (row.is_ath === 1) { // New all-time high
            if (currentATH !== null && currentATHIndex !== null) {
                // Check if we had a significant drawdown from previous ATH
                const periodData = rows.slice(currentATHIndex, i);
                const minDrawdown = Math.min(...periodData.map(r => r.drawdown));
                
                if (minDrawdown < -threshold) {
                    // Find the actual low point
                    const lowPoint = periodData.reduce((min, r) => 
                        r.close < min.close ? r : min, periodData[0]);
                    
                    // Determine severity based on drawdown percentage
                    let severity = 'mild';
                    if (Math.abs(lowPoint.drawdown) >= 20) {
                        severity = 'severe';
                    } else if (Math.abs(lowPoint.drawdown) >= 10) {
                        severity = 'moderate';
                    }
                    
                    cycles.push({
                        cycle_number: cycleNumber++,
                        severity: severity,
                        qqq_ath_date: currentATHDate,
                        qqq_ath_price: currentATH,
                        qqq_low_date: lowPoint.date,
                        qqq_low_price: lowPoint.close,
                        qqq_drawdown_pct: lowPoint.drawdown,
                        qqq_recovery_date: row.date,
                        qqq_recovery_price: row.close,
                        threshold: threshold,
                        // Legacy fields for backward compatibility
                        ath_date: currentATHDate,
                        ath_price: currentATH,
                        low_date: lowPoint.date,
                        low_price: lowPoint.close,
                        drawdown_pct: lowPoint.drawdown,
                        recovery_date: row.date,
                        recovery_price: row.close
                    });
                }
            }
            
            currentATH = row.close;
            currentATHDate = row.date;
            currentATHIndex = i;
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
            
            cycles.push({
                cycle_number: cycleNumber++,
                severity: severity,
                qqq_ath_date: currentATHDate,
                qqq_ath_price: currentATH,
                qqq_low_date: lowPoint.date,
                qqq_low_price: lowPoint.close,
                qqq_drawdown_pct: lowPoint.drawdown,
                qqq_recovery_date: recoveryPoint ? recoveryPoint.date : null,
                qqq_recovery_price: recoveryPoint ? recoveryPoint.close : null,
                threshold: threshold,
                // Legacy fields for backward compatibility
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

// Get summary statistics for a threshold
app.get('/api/summary/:threshold', (req, res) => {
    const threshold = parseInt(req.params.threshold);
    
    if (![2, 5, 10, 15, 20].includes(threshold)) {
        return res.status(400).json({ 
            error: 'Invalid threshold. Must be one of: 2, 5, 10, 15, 20' 
        });
    }

    // First get the cycles
    const query = `
        WITH qqq_data AS (
            SELECT 
                date,
                close,
                MAX(close) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING) as cummax,
                ((close - MAX(close) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING)) / 
                 MAX(close) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING)) * 100 as drawdown
            FROM qqq_all_history
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

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        const cycles = processCycles(rows, threshold);
        
        if (cycles.length === 0) {
            return res.json({
                threshold: threshold,
                totalCycles: 0,
                summary: 'No cycles found for this threshold'
            });
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

        const summary = {
            threshold: threshold,
            totalCycles: cycles.length,
            averageDrawdown: drawdowns.reduce((a, b) => a + b, 0) / drawdowns.length,
            maxDrawdown: Math.max(...drawdowns),
            minDrawdown: Math.min(...drawdowns),
            averageDurationToLow: durations.reduce((a, b) => a + b, 0) / durations.length,
            averageRecoveryTime: recoveries.reduce((a, b) => a + b, 0) / recoveries.length,
            totalDuration: durations.reduce((a, b) => a + b, 0) + recoveries.reduce((a, b) => a + b, 0),
            dateRange: {
                start: cycles[0].ath_date,
                end: cycles[cycles.length - 1].recovery_date
            }
        };

        res.json(summary);
    });
});

// Get chart data for visualization
app.get('/api/chart-data/:threshold', (req, res) => {
    const threshold = parseInt(req.params.threshold);
    
    if (![2, 5, 10, 15, 20].includes(threshold)) {
        return res.status(400).json({ 
            error: 'Invalid threshold. Must be one of: 2, 5, 10, 15, 20' 
        });
    }

    // Get QQQ price data
    const qqqQuery = `
        SELECT date, close 
        FROM qqq_all_history 
        ORDER BY date
    `;

    // Get TQQQ price data
    const tqqqQuery = `
        SELECT date, close 
        FROM tqqq_all_history 
        ORDER BY date
    `;

    db.all(qqqQuery, [], (err, qqqRows) => {
        if (err) {
            console.error('QQQ database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        db.all(tqqqQuery, [], (err, tqqqRows) => {
            if (err) {
                console.error('TQQQ database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            // Get cycles for this threshold
            const cyclesQuery = `
                WITH qqq_data AS (
                    SELECT 
                        date,
                        close,
                        MAX(close) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING) as cummax,
                        ((close - MAX(close) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING)) / 
                         MAX(close) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING)) * 100 as drawdown
                    FROM qqq_all_history
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

            db.all(cyclesQuery, [], (err, cycleRows) => {
                if (err) {
                    console.error('Cycles database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }

                const cycles = processCycles(cycleRows, threshold);

                res.json({
                    threshold: threshold,
                    qqqData: qqqRows.map(row => ({
                        date: row.date,
                        close: row.close
                    })),
                    tqqqData: tqqqRows.map(row => ({
                        date: row.date,
                        close: row.close
                    })),
                    cycles: cycles,
                    metadata: {
                        qqqPoints: qqqRows.length,
                        tqqqPoints: tqqqRows.length,
                        cycles: cycles.length,
                        dateRange: {
                            qqq: {
                                start: qqqRows[0]?.date,
                                end: qqqRows[qqqRows.length - 1]?.date
                            },
                            tqqq: {
                                start: tqqqRows[0]?.date,
                                end: tqqqRows[tqqqRows.length - 1]?.date
                            }
                        }
                    }
                });
            });
        });
    });
});

// Custom analysis endpoint
app.post('/api/analyze', (req, res) => {
    const { threshold, startDate, endDate } = req.body;
    
    if (!threshold || ![2, 5, 10, 15, 20].includes(parseInt(threshold))) {
        return res.status(400).json({ 
            error: 'Invalid threshold. Must be one of: 2, 5, 10, 15, 20' 
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

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Stock Analysis Backend running on port ${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
    console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
