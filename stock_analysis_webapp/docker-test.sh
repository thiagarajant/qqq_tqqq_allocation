#!/bin/bash

# Stock Analysis Web Application Docker Testing Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test configuration
APP_URL="http://localhost:3000"
HEALTH_ENDPOINT="$APP_URL/api/health"
API_BASE="$APP_URL/api"
TIMEOUT=30
RETRY_INTERVAL=5

# Function to check if Docker is running
check_docker() {
    print_status "Checking Docker status..."
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to check if database exists
check_database() {
    print_status "Checking database file..."
    if [ ! -f "./database/market_data.db" ]; then
        print_error "Database file not found at ./database/market_data.db"
        exit 1
    fi
    print_success "Database file found"
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=$((TIMEOUT / RETRY_INTERVAL))
    local attempt=1
    
    print_status "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        print_status "Attempt $attempt/$max_attempts: $service_name not ready yet, waiting $RETRY_INTERVAL seconds..."
        sleep $RETRY_INTERVAL
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to become ready within $TIMEOUT seconds"
    return 1
}

# Function to test health endpoint
test_health_endpoint() {
    print_status "Testing health endpoint..."
    
    local response=$(curl -s -w "%{http_code}" "$HEALTH_ENDPOINT" -o /tmp/health_response)
    local status_code=${response: -3}
    local response_body=$(cat /tmp/health_response)
    
    if [ "$status_code" = "200" ]; then
        print_success "Health endpoint returned 200 OK"
        echo "Response: $response_body"
    else
        print_error "Health endpoint returned $status_code"
        echo "Response: $response_body"
        return 1
    fi
}

# Function to test API endpoints
test_api_endpoints() {
    print_status "Testing API endpoints..."
    
    # Test cycles endpoint
    print_status "Testing /api/cycles endpoint..."
    local cycles_response=$(curl -s -w "%{http_code}" "$API_BASE/cycles/5" -o /tmp/cycles_response)
    local cycles_status=${cycles_response: -3}
    
    if [ "$cycles_status" = "200" ]; then
        print_success "Cycles endpoint returned 200 OK"
        local cycles_count=$(cat /tmp/cycles_response | jq '.cycles | length // 0' 2>/dev/null || echo "0")
        echo "Found $cycles_count cycles"
    else
        print_error "Cycles endpoint returned $cycles_status"
        return 1
    fi
    
    # Test market data endpoint
    print_status "Testing /api/market-data endpoint..."
    local market_response=$(curl -s -w "%{http_code}" "$API_BASE/market-data" -o /tmp/market_response)
    local market_status=${market_response: -3}
    
    if [ "$market_status" = "200" ]; then
        print_success "Market data endpoint returned 200 OK"
        local qqq_count=$(cat /tmp/market_response | jq '.qqq_data | length // 0' 2>/dev/null || echo "0")
        local tqqq_count=$(cat /tmp/market_response | jq '.tqqq_data | length // 0' 2>/dev/null || echo "0")
        echo "Found $qqq_count QQQ data points and $tqqq_count TQQQ data points"
    else
        print_error "Market data endpoint returned $market_status"
        return 1
    fi
}

# Function to test frontend
test_frontend() {
    print_status "Testing frontend..."
    
    # Test main page
    local main_response=$(curl -s -w "%{http_code}" "$APP_URL" -o /tmp/main_response)
    local main_status=${main_response: -3}
    
    if [ "$main_status" = "200" ]; then
        print_success "Main page returned 200 OK"
        
        # Check if it's a React app (contains React-like content)
        local main_content=$(cat /tmp/main_response)
        if echo "$main_content" | grep -q "react" || echo "$main_content" | grep -q "root"; then
            print_success "Frontend appears to be a React application"
        else
            print_warning "Frontend content doesn't appear to be React-based"
        fi
    else
        print_error "Main page returned $main_status"
        return 1
    fi
}

# Function to test container health
test_container_health() {
    print_status "Testing container health..."
    
    local health_status=$(docker inspect stock-analysis-webapp --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
    
    if [ "$health_status" = "healthy" ]; then
        print_success "Container health status: $health_status"
    elif [ "$health_status" = "starting" ]; then
        print_warning "Container is still starting up"
    else
        print_error "Container health status: $health_status"
        return 1
    fi
}

# Function to check container logs
check_container_logs() {
    print_status "Checking container logs for errors..."
    
    local error_count=$(docker-compose logs stock-analysis-app 2>/dev/null | grep -i "error\|exception\|fatal" | wc -l)
    
    if [ "$error_count" -eq 0 ]; then
        print_success "No errors found in container logs"
    else
        print_warning "Found $error_count potential errors in container logs"
        docker-compose logs stock-analysis-app | grep -i "error\|exception\|fatal" | head -5
    fi
}

# Function to test data integrity
test_data_integrity() {
    print_status "Testing data integrity..."
    
    # Test that cycles data has required fields (if any cycles exist)
    local cycles_response=$(curl -s "$API_BASE/cycles")
    local cycles_count=$(echo "$cycles_response" | jq '.length // 0' 2>/dev/null || echo "0")
    
    if [ "$cycles_count" -gt 0 ]; then
        local has_required_fields=$(echo "$cycles_response" | jq '.[0] | has("ath_date") and has("ath_price") and has("recovery_date") and has("recovery_price")' 2>/dev/null || echo "false")
        
        if [ "$has_required_fields" = "true" ]; then
            print_success "Cycles data has required fields"
        else
            print_error "Cycles data missing required fields"
            return 1
        fi
    else
        print_warning "No cycles data found (this may be expected for empty database)"
    fi
    
    # Test that market data has required fields (if any data exists)
    local market_response=$(curl -s "$API_BASE/market-data")
    local qqq_count=$(echo "$market_response" | jq '.qqqData.length // 0' 2>/dev/null || echo "0")
    local tqqq_count=$(echo "$market_response" | jq '.tqqqData.length // 0' 2>/dev/null || echo "0")
    
    if [ "$qqq_count" -gt 0 ] || [ "$tqqq_count" -gt 0 ]; then
        local qqq_has_fields=$(echo "$market_response" | jq '.qqqData[0] | has("date") and has("close")' 2>/dev/null || echo "false")
        local tqqq_has_fields=$(echo "$market_response" | jq '.tqqqData[0] | has("date") and has("close")' 2>/dev/null || echo "false")
        
        if [ "$qqq_has_fields" = "true" ] && [ "$tqqq_count" -eq 0 ] || [ "$tqqq_has_fields" = "true" ]; then
            print_success "Market data has required fields"
        else
            print_error "Market data missing required fields"
            return 1
        fi
    else
        print_warning "No market data found (this may be expected for empty database)"
    fi
    
    return 0
}

# Function to run performance test
test_performance() {
    print_status "Running performance test..."
    
    local start_time=$(date +%s.%N)
    local response=$(curl -s -w "%{http_code}" "$API_BASE/cycles" -o /dev/null)
    local end_time=$(date +%s.%N)
    
    local duration=$(echo "$end_time - $start_time" | bc 2>/dev/null || echo "0")
    
    if [ "$response" = "200" ]; then
        print_success "API response time: ${duration}s"
        
        if (( $(echo "$duration < 1.0" | bc -l 2>/dev/null || echo "1") )); then
            print_success "Performance: Excellent (< 1s)"
        elif (( $(echo "$duration < 2.0" | bc -l 2>/dev/null || echo "1") )); then
            print_success "Performance: Good (< 2s)"
        else
            print_warning "Performance: Slow (> 2s)"
        fi
    else
        print_error "Performance test failed with status $response"
    fi
}

# Function to run all tests
run_all_tests() {
    print_status "Starting comprehensive Docker testing..."
    echo "================================================"
    
    local tests_passed=0
    local tests_total=0
    
    # Run each test and count results
    tests_total=$((tests_total + 1))
    if check_docker; then
        tests_passed=$((tests_passed + 1))
    fi
    echo ""
    
    tests_total=$((tests_total + 1))
    if check_database; then
        tests_passed=$((tests_passed + 1))
    fi
    echo ""
    
    tests_total=$((tests_total + 1))
    if test_container_health; then
        tests_passed=$((tests_passed + 1))
    fi
    echo ""
    
    tests_total=$((tests_total + 1))
    if wait_for_service "$HEALTH_ENDPOINT" "API service"; then
        tests_passed=$((tests_passed + 1))
    fi
    echo ""
    
    tests_total=$((tests_total + 1))
    if test_health_endpoint; then
        tests_passed=$((tests_passed + 1))
    fi
    echo ""
    
    tests_total=$((tests_total + 1))
    if test_api_endpoints; then
        tests_passed=$((tests_passed + 1))
    fi
    echo ""
    
    tests_total=$((tests_total + 1))
    if test_frontend; then
        tests_passed=$((tests_passed + 1))
    fi
    echo ""
    
    tests_total=$((tests_total + 1))
    if test_data_integrity; then
        tests_passed=$((tests_passed + 1))
    fi
    echo ""
    
    tests_total=$((tests_total + 1))
    if test_performance; then
        tests_passed=$((tests_passed + 1))
    fi
    echo ""
    
    tests_total=$((tests_total + 1))
    if check_container_logs; then
        tests_passed=$((tests_passed + 1))
    fi
    echo ""
    
    echo "================================================"
    print_status "Testing completed!"
    print_status "Tests passed: $tests_passed/$tests_total"
    
    if [ $tests_passed -eq $tests_total ]; then
        print_success "All tests passed! Application is working correctly."
        return 0
    else
        print_error "Some tests failed. Please check the output above."
        return 1
    fi
}

# Function to show help
show_help() {
    echo "Stock Analysis Web Application Docker Testing Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  all       Run all tests (default)"
    echo "  health    Test health endpoint only"
    echo "  api       Test API endpoints only"
    echo "  frontend  Test frontend only"
    echo "  data      Test data integrity only"
    echo "  perf      Run performance test only"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0         # Run all tests"
    echo "  $0 health  # Test health endpoint only"
    echo "  $0 api     # Test API endpoints only"
}

# Main script logic
case "${1:-all}" in
    "all")
        run_all_tests
        ;;
    "health")
        check_docker
        check_database
        wait_for_service "$HEALTH_ENDPOINT" "Health endpoint"
        test_health_endpoint
        ;;
    "api")
        check_docker
        check_database
        wait_for_service "$HEALTH_ENDPOINT" "API service"
        test_api_endpoints
        ;;
    "frontend")
        check_docker
        check_database
        wait_for_service "$APP_URL" "Frontend service"
        test_frontend
        ;;
    "data")
        check_docker
        check_database
        wait_for_service "$HEALTH_ENDPOINT" "API service"
        test_data_integrity
        ;;
    "perf")
        check_docker
        check_database
        wait_for_service "$HEALTH_ENDPOINT" "API service"
        test_performance
        ;;
    "help"|*)
        show_help
        ;;
esac
