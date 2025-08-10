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

// Get cycles for specific threshold
app.get('/api/cycles/:threshold', (req, res) => {
    const threshold = parseFloat(req.params.threshold);
    
    if (!isValidThreshold(threshold)) {
        return res.status(400).json({ 
            error: 'Invalid threshold. Must be between 0.1% and 50%' 
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
    const threshold = parseFloat(req.params.threshold);
    
    if (!isValidThreshold(threshold)) {
        return res.status(400).json({ 
            error: 'Invalid threshold. Must be between 0.1% and 50%' 
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

        // Calculate severity breakdown
        const severeCycles = cycles.filter(c => c.severity === 'severe').length;
        const moderateCycles = cycles.filter(c => c.severity === 'moderate').length;
        const mildCycles = cycles.filter(c => c.severity === 'mild').length;

        const summary = {
            threshold: threshold,
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

        res.json(summary);
    });
});

// Get chart data for visualization
app.get('/api/chart-data/:threshold', (req, res) => {
    const threshold = parseFloat(req.params.threshold);
    
    if (!isValidThreshold(threshold)) {
        return res.status(400).json({ 
            error: 'Invalid threshold. Must be between 0.1% and 50%' 
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
    const { amount, startDate, endDate, threshold } = req.body;
    
    if (!amount || !startDate || !endDate || !threshold) {
        return res.status(400).json({ 
            error: 'Missing required parameters: amount, startDate, endDate, threshold' 
        });
    }

        if (!isValidThreshold(threshold)) {
        return res.status(400).json({ 
            error: 'Invalid threshold. Must be between 0.1% and 50%'
        });
    }

    // Get QQQ data for the period
    const qqqQuery = `
        SELECT date, close 
        FROM qqq_all_history 
        WHERE date >= ? AND date <= ? 
        ORDER BY date
    `;

    // Get TQQQ data for the period  
    const tqqqQuery = `
        SELECT date, close 
        FROM tqqq_all_history 
        WHERE date >= ? AND date <= ? 
        ORDER BY date
    `;

    db.all(qqqQuery, [startDate, endDate], (err, qqqData) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (qqqData.length === 0) {
            return res.status(400).json({ error: 'No QQQ data found for the specified date range' });
        }

        db.all(tqqqQuery, [startDate, endDate], (err, tqqqData) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (tqqqData.length === 0) {
                return res.status(400).json({ error: 'No TQQQ data found for the specified date range' });
            }

            try {
                const simulation = calculatePortfolioSimulation(amount, qqqData, tqqqData, threshold, startDate, endDate);
                res.json(simulation);
            } catch (error) {
                console.error('Simulation error:', error);
                res.status(500).json({ error: 'Simulation calculation failed' });
            }
        });
    });
});

function calculatePortfolioSimulation(initialAmount, qqqData, tqqqData, threshold, startDate, endDate) {
    if (qqqData.length === 0 || tqqqData.length === 0) {
        throw new Error('Insufficient data for simulation');
    }

    const startPrice_QQQ = qqqData[0].close;
    const endPrice_QQQ = qqqData[qqqData.length - 1].close;
    const startPrice_TQQQ = tqqqData[0].close;
    const endPrice_TQQQ = tqqqData[tqqqData.length - 1].close;

    // Calculate QQQ only performance
    const qqqShares = initialAmount / startPrice_QQQ;
    const qqqFinalValue = qqqShares * endPrice_QQQ;
    const qqqTotalReturn = qqqFinalValue - initialAmount;
    const qqqTotalReturnPct = (qqqTotalReturn / initialAmount) * 100;

    // Calculate TQQQ only performance
    const tqqqShares = initialAmount / startPrice_TQQQ;
    const tqqqFinalValue = tqqqShares * endPrice_TQQQ;
    const tqqqTotalReturn = tqqqFinalValue - initialAmount;
    const tqqqTotalReturnPct = (tqqqTotalReturn / initialAmount) * 100;

    // Calculate time period
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const durationDays = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24));
    const durationYears = durationDays / 365.25;

    // Calculate annualized returns
    const qqqAnnualizedReturn = (Math.pow(qqqFinalValue / initialAmount, 1 / durationYears) - 1) * 100;
    const tqqqAnnualizedReturn = (Math.pow(tqqqFinalValue / initialAmount, 1 / durationYears) - 1) * 100;

    // Calculate strategy performance (QQQ with TQQQ during drawdowns)
    let strategyValue = initialAmount;
    let currentHolding = 'QQQ'; // Start with QQQ
    let qqqATH = qqqData[0].close;
    let switches = 0;
    
    // Create aligned data arrays
    const alignedData = [];
    for (let i = 0; i < qqqData.length; i++) {
        const qqqEntry = qqqData[i];
        const tqqqEntry = tqqqData.find(t => t.date === qqqEntry.date);
        if (tqqqEntry) {
            alignedData.push({
                date: qqqEntry.date,
                qqq_price: qqqEntry.close,
                tqqq_price: tqqqEntry.close
            });
        }
    }

    if (alignedData.length > 1) {
        let shares = strategyValue / alignedData[0].qqq_price; // Start with QQQ shares
        
        for (let i = 1; i < alignedData.length; i++) {
            const current = alignedData[i];
            const previous = alignedData[i - 1];
            
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
        
        const strategyTotalReturn = strategyValue - initialAmount;
        const strategyTotalReturnPct = (strategyTotalReturn / initialAmount) * 100;
        const strategyAnnualizedReturn = (Math.pow(strategyValue / initialAmount, 1 / durationYears) - 1) * 100;

        return {
            startDate,
            endDate,
            initialInvestment: initialAmount,
            strategy: `QQQ→TQQQ at ${threshold}% drawdown`,
            
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
            
            // Additional metrics
            durationDays,
            durationYears: parseFloat(durationYears.toFixed(2))
        };
    } else {
        // Fallback if no aligned data
        return {
            startDate,
            endDate,
            initialInvestment: initialAmount,
            strategy: `QQQ→TQQQ at ${threshold}% drawdown`,
            
            qqqFinalValue: Math.round(qqqFinalValue),
            qqqTotalReturn: Math.round(qqqTotalReturn),
            qqqTotalReturnPct: parseFloat(qqqTotalReturnPct.toFixed(2)),
            qqqAnnualizedReturn: parseFloat(qqqAnnualizedReturn.toFixed(2)),
            
            tqqqFinalValue: Math.round(tqqqFinalValue),
            tqqqTotalReturn: Math.round(tqqqTotalReturn),
            tqqqTotalReturnPct: parseFloat(tqqqTotalReturnPct.toFixed(2)),
            tqqqAnnualizedReturn: parseFloat(tqqqAnnualizedReturn.toFixed(2)),
            
            durationDays,
            durationYears: parseFloat(durationYears.toFixed(2))
        };
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Stock Analysis Backend running on port ${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
    console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
