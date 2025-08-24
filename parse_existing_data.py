#!/usr/bin/env python3
import os
import sqlite3
import csv
from datetime import datetime
from pathlib import Path

# Database path
DB_PATH = "stock_analysis_webapp/database/market_data.db"
DATA_DIR = "/Users/thiags/Downloads/data 2/daily/us"

# Exchange mappings
EXCHANGES = {
    'nasdaq stocks': 'NASDAQ',
    'nyse stocks': 'NYSE', 
    'nysemkt stocks': 'NYSEMKT',
    'nasdaq etfs': 'NASDAQ',
    'nyse etfs': 'NYSE',
    'nysemkt etfs': 'NYSEMKT'
}

def parse_csv_line(line):
    """Parse a CSV line from the data file"""
    parts = line.strip().split(',')
    if len(parts) < 10:
        return None
    
    ticker, period, date, time, open_price, high, low, close, volume, openint = parts
    
    # Skip header or invalid lines
    if ticker == '<TICKER>' or not ticker or not date:
        return None
    
    try:
        # Parse date (format: YYYYMMDD)
        year = date[:4]
        month = date[4:6]
        day = date[6:8]
        formatted_date = f"{year}-{month}-{day}"
        
        return {
            'symbol': ticker.replace('.US', '').replace('.us', ''),
            'date': formatted_date,
            'open': float(open_price),
            'high': float(high),
            'low': float(low),
            'close': float(close),
            'volume': float(volume)
        }
    except (ValueError, IndexError):
        return None

def process_data_file(file_path, exchange, db_conn):
    """Process a single data file"""
    processed = 0
    errors = 0
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # Skip header line
        for line in lines[1:]:
            parsed = parse_csv_line(line)
            
            if not parsed:
                errors += 1
                continue
            
            # Insert into database
            cursor = db_conn.cursor()
            try:
                cursor.execute("""
                    INSERT OR REPLACE INTO historical_prices 
                    (symbol, date, open, high, low, close, volume) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    parsed['symbol'],
                    parsed['date'],
                    parsed['open'],
                    parsed['high'],
                    parsed['low'],
                    parsed['close'],
                    parsed['volume']
                ))
                processed += 1
            except sqlite3.Error as e:
                errors += 1
                print(f"❌ DB Error for {parsed['symbol']}: {e}")
            
            cursor.close()
        
    except Exception as e:
        print(f"❌ Error reading {file_path}: {e}")
        errors += 1
    
    return processed, errors

def process_directory(dir_path, exchange, db_conn):
    """Process all files in a directory recursively"""
    total_processed = 0
    total_errors = 0
    
    try:
        items = os.listdir(dir_path)
        
        for item in items:
            full_path = os.path.join(dir_path, item)
            
            if os.path.isdir(full_path):
                # Recursively process subdirectories
                processed, errors = process_directory(full_path, exchange, db_conn)
                total_processed += processed
                total_errors += errors
            elif item.endswith('.txt'):
                # Process data file
                processed, errors = process_data_file(full_path, exchange, db_conn)
                total_processed += processed
                total_errors += errors
                
                # Add symbol to symbols table
                symbol = item.replace('.txt', '').replace('.US', '').replace('.us', '')
                cursor = db_conn.cursor()
                
                try:
                    is_etf = 'etf' in exchange.lower()
                    cursor.execute("""
                        INSERT OR IGNORE INTO symbols (symbol, name, exchange) 
                        VALUES (?, ?, ?)
                    """, (symbol, symbol, exchange))
                except sqlite3.Error as e:
                    print(f"❌ Error adding symbol {symbol}: {e}")
                
                cursor.close()
    
    except Exception as e:
        print(f"❌ Error processing directory {dir_path}: {e}")
    
    return total_processed, total_errors

def update_data_freshness(db_conn):
    """Update data freshness table with summary information"""
    cursor = db_conn.cursor()
    
    try:
        # Get summary for each symbol
        cursor.execute("""
            SELECT symbol, COUNT(*) as count, MIN(date) as earliest, MAX(date) as latest
            FROM historical_prices 
            GROUP BY symbol
        """)
        
        rows = cursor.fetchall()
        
        # Update data freshness
        for row in rows:
            symbol, count, earliest, latest = row
            cursor.execute("""
                INSERT OR REPLACE INTO data_freshness 
                (symbol, last_updated, status, error_count) 
                VALUES (?, datetime('now'), 'active', 0)
            """, (symbol,))
        
        print(f"\n💾 Database updated with {len(rows)} symbols")
        
    except sqlite3.Error as e:
        print(f"❌ Error updating data freshness: {e}")
    
    cursor.close()

def main():
    """Main processing function"""
    print("🚀 Starting data import from existing files...")
    print(f"📁 Data directory: {DATA_DIR}")
    
    if not os.path.exists(DATA_DIR):
        print(f"❌ Data directory not found: {DATA_DIR}")
        return
    
    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found: {DB_PATH}")
        return
    
    # Connect to database
    try:
        db_conn = sqlite3.connect(DB_PATH)
        print("✅ Connected to database")
    except sqlite3.Error as e:
        print(f"❌ Database connection error: {e}")
        return
    
    grand_total_processed = 0
    grand_total_errors = 0
    
    # Process each exchange directory
    for exchange_dir, exchange_name in EXCHANGES.items():
        exchange_path = os.path.join(DATA_DIR, exchange_dir)
        
        if os.path.exists(exchange_path):
            print(f"\n📊 Processing {exchange_dir} ({exchange_name})...")
            
            processed, errors = process_directory(exchange_path, exchange_name, db_conn)
            grand_total_processed += processed
            grand_total_errors += errors
            
            print(f"✅ {exchange_dir}: {processed:,} records, {errors} errors")
    
    print(f"\n🎉 Import Complete!")
    print(f"📊 Total records processed: {grand_total_processed:,}")
    print(f"❌ Total errors: {grand_total_errors}")
    
    # Update data freshness
    update_data_freshness(db_conn)
    
    # Commit and close
    db_conn.commit()
    db_conn.close()
    
    print("💾 Database import completed successfully!")

if __name__ == "__main__":
    main()
