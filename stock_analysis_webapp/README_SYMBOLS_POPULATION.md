# US Symbols Population System

This system automatically populates your database with **all US stock and ETF symbols** from Stooq.com when the server starts.

## 🎯 What It Does

- **Fetches ~11,455 US symbols** across all major exchanges:
  - **NASDAQ Stocks**: 4,908 symbols
  - **NYSE Stocks**: 3,525 symbols  
  - **NASDAQ ETFs**: 331 symbols
  - **NYSE ETFs**: 2,691 symbols

- **Downloads historical price data** for each symbol
- **Stores everything in your local database** for fast access
- **Runs automatically on server startup** (configurable)

## 🚀 How to Use

### Automatic Population (Default)
The system automatically starts populating symbols 2 seconds after the server starts:

```bash
# Start server normally - symbols will populate automatically
npm start
```

### Skip Population (Development/Testing)
To skip the automatic population:

```bash
# Option 1: Environment variable
SKIP_POPULATION=true npm start

# Option 2: Command line flag
npm start -- --skip-population
```

### Manual Population Control
You can manually trigger or check the population process:

```bash
# Start population manually
curl -X POST http://localhost:3000/api/admin/populate-symbols

# Check if population is running
curl http://localhost:3000/api/admin/population-status

# Get database summary
curl http://localhost:3000/api/admin/database-summary
```

## 📊 Progress Tracking

The system provides detailed progress updates:

```
🔄 Starting comprehensive US symbols population...
📊 Target: ~11,455 US symbols across all exchanges

📊 Processing NASDAQ Stocks (4908 symbols)...
✅ Found 200 symbols for NASDAQ Stocks
📈 Progress: 50/4908 symbols processed (2.5 symbols/sec) - AAPL added with 1250 data points
📈 Progress: 100/4908 symbols processed (2.1 symbols/sec) - MSFT added with 1250 data points
...
```

## ⚡ Performance & Rate Limiting

- **Rate Limiting**: 50ms delay between requests (respectful to Stooq)
- **Adaptive Delays**: Increases delay if too many failures occur
- **Progress Updates**: Every 50 symbols processed
- **Estimated Time**: Shows remaining time based on current rate

## 🗄️ Database Storage

### Symbols Table
- `symbol`: Stock/ETF symbol (e.g., AAPL, SPY)
- `name`: Display name
- `sector`: Stock/ETF type
- `exchange`: Exchange name (NASDAQ, NYSE)
- `is_active`: Whether symbol is active

### Historical Prices Table
- `symbol`: Stock/ETF symbol
- `date`: Trading date
- `open`, `high`, `low`, `close`: Price data
- `volume`: Trading volume

### Data Freshness Table
- `symbol`: Stock/ETF symbol
- `last_updated`: When data was last refreshed
- `status`: Data status (active, error)
- `error_count`: Number of consecutive errors

## 🔧 Configuration

### Environment Variables
```bash
# Skip automatic population
SKIP_POPULATION=true

# Customize rate limiting (milliseconds)
RATE_LIMIT_DELAY=50
```

### Command Line Options
```bash
# Skip population
npm start -- --skip-population

# Show help
npm start -- --help
```

## 📈 Monitoring & Statistics

### Real-time Progress
- Console logs show live progress
- Success/failure rates
- Processing speed (symbols per second)
- Estimated completion time

### Database Statistics
```bash
curl http://localhost:3000/api/admin/database-summary
```

Response:
```json
{
  "status": "success",
  "summary": {
    "exchanges": [
      {
        "exchange": "NASDAQ",
        "symbol_count": 200,
        "active_count": 195
      }
    ],
    "total_price_records": 250000,
    "recent_activity": {
      "symbols_updated_today": 50,
      "last_update": "2024-01-15T10:30:00Z"
    }
  }
}
```

## 🚨 Error Handling

- **Individual Symbol Failures**: Logged but don't stop the process
- **Rate Limiting**: Automatically adjusts if too many failures
- **Database Errors**: Logged with details
- **Network Issues**: Retries with exponential backoff

## 💡 Best Practices

### For Production
1. **Run during off-peak hours** to avoid overwhelming Stooq
2. **Monitor rate limiting** to ensure respectful API usage
3. **Check logs regularly** for any systematic failures
4. **Use manual triggers** for controlled updates

### For Development
1. **Use SKIP_POPULATION=true** to skip during development
2. **Test with small subsets** first
3. **Monitor database size** as it will grow significantly

## 🔍 Troubleshooting

### Common Issues

**Population not starting:**
```bash
# Check if population is disabled
echo $SKIP_POPULATION

# Check command line flags
npm start -- --help
```

**Too many failures:**
- System automatically increases delays
- Check Stooq.com availability
- Verify network connectivity

**Database errors:**
- Check database permissions
- Ensure tables exist
- Check disk space

### Log Analysis
```bash
# Watch population progress
docker logs -f stock_analysis_webapp-backend-1 | grep -E "(Progress|Failed|Complete)"

# Check for errors
docker logs stock_analysis_webapp-backend-1 | grep -E "(Error|Failed|Warning)"
```

## 📚 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/populate-symbols` | POST | Start manual population |
| `/api/admin/population-status` | GET | Check population status |
| `/api/admin/database-summary` | GET | Get database statistics |

## 🎉 Success Indicators

When population completes successfully, you'll see:

```
🎯 US Symbols Population Complete!
⏱️ Total Time: 45.2 seconds
📊 Total Processed: 200
✅ Successful: 195
❌ Failed: 5
📈 Success Rate: 97.5%

📊 Database Statistics:
   Total Symbols: 200
   Active Symbols: 195
   Historical Price Records: 250,000
   Average Records per Symbol: 1250
```

## 🔄 Updating Existing Data

To refresh data for specific symbols:

```bash
# Refresh single symbol
curl -X POST http://localhost:3000/api/symbols/AAPL/refresh

# Refresh with date range
curl -X POST http://localhost:3000/api/symbols/AAPL/refresh \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2023-01-01", "endDate": "2024-01-01"}'
```

## 📞 Support

If you encounter issues:

1. **Check the logs** for detailed error messages
2. **Verify Stooq.com** is accessible
3. **Check database connectivity**
4. **Review rate limiting settings**

The system is designed to be robust and self-healing, so most issues resolve automatically.
