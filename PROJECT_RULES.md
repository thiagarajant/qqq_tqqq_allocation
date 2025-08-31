# Project Rules for Stock Market Analysis Project

## General Instructions to Remember

1. **Save General Instructions**: When user provides general instructions, save them as rules/memory for this project only
2. **Data Requirements**: Focus on daily open and close prices for stocks and ETFs for comprehensive market analysis
3. **Output Format**: Provide data in CSV format with Date, Open, Close columns
4. **Error Handling**: Handle API issues gracefully and provide alternative solutions
5. **Documentation**: Always provide clear documentation and usage instructions
6. **Price Accuracy**: Ensure prices reflect real market data, not fictional sample data
7. **Data Validation**: Verify price ranges are realistic and match current market conditions
8. **No Fallback Methods**: Do not use any fallback or sample data methods - only use real data sources

## Current Issue
- yfinance library is having connection issues with Yahoo Finance API
- Sample data generated is fictional and doesn't match real market prices
- Need to implement alternative data sources or better error handling
- TQQQ current price should be around $92, not the fictional $22.90 in sample data

## Project Goals
- Fetch comprehensive daily open/close prices for stocks and ETFs
- Save data to CSV files
- Generate comparison charts
- Provide summary statistics
- Use real market data, not fictional sample data
- No fallback methods - only real data sources
