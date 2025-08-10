import sqlite3
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path

DB_PATH = Path("../../market_data.db")

def load_qqq_data():
    """Load QQQ close prices from database"""
    with sqlite3.connect(DB_PATH) as con:
        df = pd.read_sql_query("""
            SELECT date, close 
            FROM qqq_all_history 
            ORDER BY date
        """, con)
        df['date'] = pd.to_datetime(df['date'])
        return df

def load_tqqq_data():
    """Load TQQQ close prices from database"""
    with sqlite3.connect(DB_PATH) as con:
        df = pd.read_sql_query("""
            SELECT date, close 
            FROM tqqq_all_history 
            ORDER BY date
        """, con)
        df['date'] = pd.to_datetime(df['date'])
        return df

def find_all_time_highs_and_drawdowns(df):
    """Find all-time highs and subsequent drawdowns > 10%"""
    df = df.copy()
    df['cummax'] = df['close'].cummax()
    df['drawdown'] = (df['close'] - df['cummax']) / df['cummax'] * 100
    
    # Find all-time highs (when close equals cummax)
    ath_points = df[df['close'] == df['cummax']].copy()
    
    # Find drawdown periods > 10%
    drawdown_periods = []
    current_ath = None
    current_ath_idx = None
    
    for idx, row in df.iterrows():
        if row['close'] == row['cummax']:  # New all-time high
            if current_ath is not None and current_ath_idx is not None:
                # Check if we had a significant drawdown from previous ATH
                period_data = df.loc[current_ath_idx:idx]
                min_dd = period_data['drawdown'].min()
                if min_dd < -10:  # More than 10% drawdown
                    # Find the actual low point
                    low_idx = period_data['close'].idxmin()
                    low_price = df.loc[low_idx, 'close']
                    low_date = df.loc[low_idx, 'date']
                    
                    drawdown_periods.append({
                        'ath_date': df.loc[current_ath_idx, 'date'],
                        'ath_price': current_ath,
                        'low_date': low_date,
                        'low_price': low_price,
                        'drawdown_pct': min_dd,
                        'recovery_date': row['date'],
                        'recovery_price': row['close']
                    })
            
            current_ath = row['close']
            current_ath_idx = idx
    
    return ath_points, drawdown_periods

def get_tqqq_prices_for_periods(tqqq_df, drawdown_periods):
    """Get TQQQ prices at ATH, low, and recovery points for each QQQ cycle"""
    tqqq_periods = []
    
    for period in drawdown_periods:
        ath_date = period['ath_date']
        low_date = period['low_date']
        recovery_date = period['recovery_date']
        
        # Find closest TQQQ prices for these dates
        ath_tqqq = tqqq_df[tqqq_df['date'] <= ath_date]['close'].iloc[-1] if len(tqqq_df[tqqq_df['date'] <= ath_date]) > 0 else None
        low_tqqq = tqqq_df[tqqq_df['date'] <= low_date]['close'].iloc[-1] if len(tqqq_df[tqqq_df['date'] <= low_date]) > 0 else None
        recovery_tqqq = tqqq_df[tqqq_df['date'] <= recovery_date]['close'].iloc[-1] if len(tqqq_df[tqqq_df['date'] <= recovery_date]) > 0 else None
        
        # Calculate TQQQ drawdown if we have the data
        tqqq_drawdown = None
        if ath_tqqq and low_tqqq:
            tqqq_drawdown = ((low_tqqq - ath_tqqq) / ath_tqqq) * 100
        
        tqqq_periods.append({
            'ath_tqqq': ath_tqqq,
            'low_tqqq': low_tqqq,
            'recovery_tqqq': recovery_tqqq,
            'tqqq_drawdown': tqqq_drawdown
        })
    
    return tqqq_periods

def plot_cycles_with_annotations(df, ath_points, drawdown_periods, tqqq_df=None, tqqq_periods=None):
    """Plot QQQ price with ATH points and drawdown periods annotated"""
    
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(16, 16))
    
    # Plot 1: QQQ
    ax1.plot(df['date'], df['close'], color='blue', linewidth=1, alpha=0.7, label='QQQ Close')
    
    # Plot all-time highs
    ax1.scatter(ath_points['date'], ath_points['close'], 
               color='green', s=50, alpha=0.8, label='All-Time Highs', zorder=5)
    
    # Annotate drawdown periods
    for i, period in enumerate(drawdown_periods):
        # Draw lines connecting ATH to low to recovery
        ath_date = period['ath_date']
        low_date = period['low_date']
        recovery_date = period['recovery_date']
        
        # ATH to Low (red line)
        ax1.plot([ath_date, low_date], [period['ath_price'], period['low_price']], 
                color='red', linewidth=2, alpha=0.7)
        
        # Low to Recovery (green line)
        ax1.plot([low_date, recovery_date], [period['low_price'], period['recovery_price']], 
                color='green', linewidth=2, alpha=0.7)
        
        # Add annotations
        ax1.annotate(f"ATH: ${period['ath_price']:.2f}\n{ath_date.strftime('%Y-%m-%d')}", 
                   xy=(ath_date, period['ath_price']), xytext=(10, 10),
                   textcoords='offset points', fontsize=8, 
                   bbox=dict(boxstyle='round,pad=0.3', facecolor='lightgreen', alpha=0.7),
                   arrowprops=dict(arrowstyle='->', connectionstyle='arc3,rad=0'))
        
        ax1.annotate(f"Low: ${period['low_price']:.2f}\n{low_date.strftime('%Y-%m-%d')}\n({period['drawdown_pct']:.1f}%)", 
                   xy=(low_date, period['low_price']), xytext=(10, -20),
                   textcoords='offset points', fontsize=8,
                   bbox=dict(boxstyle='round,pad=0.3', facecolor='lightcoral', alpha=0.7),
                   arrowprops=dict(arrowstyle='->', connectionstyle='arc3,rad=0'))
    
    ax1.set_title('QQQ Price Cycles: All-Time Highs and >10% Drawdowns', fontsize=14, fontweight='bold')
    ax1.set_ylabel('QQQ Price ($)', fontsize=12)
    ax1.grid(True, alpha=0.3)
    ax1.legend()
    
    # Plot 2: TQQQ (if available)
    if tqqq_df is not None and tqqq_periods is not None:
        ax2.plot(tqqq_df['date'], tqqq_df['close'], color='red', linewidth=1, alpha=0.7, label='TQQQ Close')
        
        # Annotate TQQQ prices for the same periods
        for i, (period, tqqq_period) in enumerate(zip(drawdown_periods, tqqq_periods)):
            ath_date = period['ath_date']
            low_date = period['low_date']
            recovery_date = period['recovery_date']
            
            if tqqq_period['ath_tqqq'] and tqqq_period['low_tqqq'] and tqqq_period['recovery_tqqq']:
                # Draw lines for TQQQ
                ax2.plot([ath_date, low_date], [tqqq_period['ath_tqqq'], tqqq_period['low_tqqq']], 
                        color='red', linewidth=2, alpha=0.7)
                ax2.plot([low_date, recovery_date], [tqqq_period['low_tqqq'], tqqq_period['recovery_tqqq']], 
                        color='green', linewidth=2, alpha=0.7)
                
                # Add TQQQ annotations
                ax2.annotate(f"TQQQ ATH: ${tqqq_period['ath_tqqq']:.2f}", 
                           xy=(ath_date, tqqq_period['ath_tqqq']), xytext=(10, 10),
                           textcoords='offset points', fontsize=8, 
                           bbox=dict(boxstyle='round,pad=0.3', facecolor='lightgreen', alpha=0.7),
                           arrowprops=dict(arrowstyle='->', connectionstyle='arc3,rad=0'))
                
                ax2.annotate(f"TQQQ Low: ${tqqq_period['low_tqqq']:.2f}\n({tqqq_period['tqqq_drawdown']:.1f}%)", 
                           xy=(low_date, tqqq_period['low_tqqq']), xytext=(10, -20),
                           textcoords='offset points', fontsize=8,
                           bbox=dict(boxstyle='round,pad=0.3', facecolor='lightcoral', alpha=0.7),
                           arrowprops=dict(arrowstyle='->', connectionstyle='arc3,rad=0'))
        
        ax2.set_title('TQQQ Performance During QQQ Cycles', fontsize=14, fontweight='bold')
        ax2.set_xlabel('Date', fontsize=12)
        ax2.set_ylabel('TQQQ Price ($)', fontsize=12)
        ax2.grid(True, alpha=0.3)
        ax2.legend()
    
    plt.tight_layout()
    plt.savefig('../qqq_tqqq_cycles_analysis.png', dpi=300, bbox_inches='tight')
    plt.show()
    
    print("QQQ and TQQQ cycles analysis plot saved as 'qqq_tqqq_cycles_analysis.png'")

def print_cycle_summary(drawdown_periods, tqqq_periods=None):
    """Print detailed summary of all cycles with TQQQ data"""
    print("\n" + "="*100)
    print("QQQ & TQQQ CYCLE ANALYSIS: All-Time Highs and >10% Drawdowns")
    print("="*100)
    
    print(f"\nTotal cycles identified: {len(drawdown_periods)}")
    
    for i, period in enumerate(drawdown_periods, 1):
        print(f"\n--- Cycle {i} ---")
        print(f"QQQ All-Time High: ${period['ath_price']:.2f} on {period['ath_date'].strftime('%Y-%m-%d')}")
        print(f"QQQ Low Point:     ${period['low_price']:.2f} on {period['low_date'].strftime('%Y-%m-%d')}")
        print(f"QQQ Recovery:      ${period['recovery_price']:.2f} on {period['recovery_date'].strftime('%Y-%m-%d')}")
        print(f"QQQ Drawdown:      {period['drawdown_pct']:.1f}%")
        
        # TQQQ data if available
        if tqqq_periods and i <= len(tqqq_periods):
            tqqq_period = tqqq_periods[i-1]
            if tqqq_period['ath_tqqq']:
                print(f"TQQQ ATH:         ${tqqq_period['ath_tqqq']:.2f}")
            if tqqq_period['low_tqqq']:
                print(f"TQQQ Low:         ${tqqq_period['low_tqqq']:.2f}")
            if tqqq_period['recovery_tqqq']:
                print(f"TQQQ Recovery:    ${tqqq_period['recovery_tqqq']:.2f}")
            if tqqq_period['tqqq_drawdown']:
                print(f"TQQQ Drawdown:    {tqqq_period['tqqq_drawdown']:.1f}%")
        
        # Calculate durations
        dd_duration = (period['low_date'] - period['ath_date']).days
        recovery_duration = (period['recovery_date'] - period['low_date']).days
        total_duration = (period['recovery_date'] - period['ath_date']).days
        
        print(f"Duration:          {dd_duration} days to low, {recovery_duration} days to recovery ({total_duration} total)")
        
        # Calculate price changes
        dd_change = ((period['low_price'] - period['ath_price']) / period['ath_price']) * 100
        recovery_change = ((period['recovery_price'] - period['low_price']) / period['low_price']) * 100
        
        print(f"QQQ Price Change:  {dd_change:.1f}% to low, +{recovery_change:.1f}% to recovery")
        
        # TQQQ price changes if available
        if tqqq_periods and i <= len(tqqq_periods):
            tqqq_period = tqqq_periods[i-1]
            if tqqq_period['ath_tqqq'] and tqqq_period['low_tqqq']:
                tqqq_dd_change = ((tqqq_period['low_tqqq'] - tqqq_period['ath_tqqq']) / tqqq_period['ath_tqqq']) * 100
                print(f"TQQQ Price Change: {tqqq_dd_change:.1f}% to low", end="")
                if tqqq_period['recovery_tqqq']:
                    tqqq_rec_change = ((tqqq_period['recovery_tqqq'] - tqqq_period['low_tqqq']) / tqqq_period['low_tqqq']) * 100
                    print(f", +{tqqq_rec_change:.1f}% to recovery")
                else:
                    print()

def main():
    """Main function to analyze QQQ cycles with TQQQ data"""
    print("Loading QQQ and TQQQ data and analyzing price cycles...")
    
    try:
        # Load data
        qqq_df = load_qqq_data()
        print(f"Loaded {len(qqq_df):,} QQQ records from {qqq_df['date'].min().strftime('%Y-%m-%d')} to {qqq_df['date'].max().strftime('%Y-%m-%d')}")
        
        # Try to load TQQQ data
        tqqq_df = None
        tqqq_periods = None
        try:
            tqqq_df = load_tqqq_data()
            print(f"Loaded {len(tqqq_df):,} TQQQ records from {tqqq_df['date'].min().strftime('%Y-%m-%d')} to {tqqq_df['date'].max().strftime('%Y-%m-%d')}")
        except Exception as e:
            print(f"Warning: Could not load TQQQ data: {e}")
        
        # Find cycles
        ath_points, drawdown_periods = find_all_time_highs_and_drawdowns(qqq_df)
        
        print(f"Found {len(ath_points)} all-time high points")
        print(f"Found {len(drawdown_periods)} drawdown periods > 10%")
        
        # Get TQQQ data for these periods if available
        if tqqq_df is not None:
            tqqq_periods = get_tqqq_prices_for_periods(tqqq_df, drawdown_periods)
            print(f"Matched TQQQ data for {len([p for p in tqqq_periods if p['ath_tqqq'] is not None])} cycles")
        
        # Print summary
        print_cycle_summary(drawdown_periods, tqqq_periods)
        
        # Create visualization
        plot_cycles_with_annotations(qqq_df, ath_points, drawdown_periods, tqqq_df, tqqq_periods)
        
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure the database file 'market_data.db' exists and contains the required tables.")

if __name__ == "__main__":
    main()
