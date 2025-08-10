#!/bin/bash

# Simple Test Runner for Stock Analysis Web Application

set -e

echo "🚀 Starting Stock Analysis Web Application Docker Testing"
echo "========================================================"

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: Please run this script from the stock_analysis_webapp directory"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    docker-compose down
    echo "✅ Cleanup completed"
}

# Set trap to cleanup on script exit
trap cleanup EXIT

echo "📦 Building and starting the application..."
./docker-run.sh run

echo ""
echo "⏳ Waiting for application to be ready..."
sleep 10

echo ""
echo "🧪 Running comprehensive tests..."
./docker-test.sh all

echo ""
echo "📊 Test Results Summary:"
echo "========================"
echo "✅ Application is running and accessible at http://localhost:3000"
echo "✅ All tests completed"
echo ""
echo "🔍 You can now:"
echo "   - View the application at http://localhost:3000"
echo "   - Check logs with: docker-compose logs -f"
echo "   - Run specific tests with: ./docker-test.sh [health|api|frontend|data|perf]"
echo "   - Stop the application with: ./docker-run.sh stop"
echo ""
echo "🎯 Testing completed successfully!"
