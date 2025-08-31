#!/bin/bash

# 🚀 Stock Market Analysis Website Launcher
# This script reloads and launches all required services

set -e  # Exit on any error

echo "🎯 Stock Market Analysis Website Launcher"
echo "=========================================="

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

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop first."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to check if Docker Compose is available
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        print_error "docker-compose is not installed or not in PATH"
        exit 1
    fi
    print_success "Docker Compose is available"
}

# Function to stop all services
stop_services() {
    print_status "Stopping all services..."
    docker-compose down --remove-orphans 2>/dev/null || true
    print_success "All services stopped"
}

# Function to clean up containers and networks
cleanup() {
    print_status "Cleaning up containers and networks..."
    
    # Stop and remove containers
    docker-compose down --remove-orphans 2>/dev/null || true
    
    # Remove any dangling containers
    docker container prune -f 2>/dev/null || true
    
    # Remove any dangling networks
    docker network prune -f 2>/dev/null || true
    
    print_success "Cleanup completed"
}

# Function to start services
start_services() {
    print_status "Starting services..."
    
    # Start the backend (production) service
    print_status "Starting backend service..."
    docker-compose up -d stock-market-analysis-app
    
    # Wait for backend to be ready
    print_status "Waiting for backend to be ready..."
    sleep 10
    
    # Check backend health
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        print_success "Backend is healthy and running on http://localhost:3000/"
    else
        print_warning "Backend health check failed, but continuing..."
    fi
    
    # Start the frontend (development) service
    print_status "Starting frontend development service..."
    docker-compose --profile dev up -d stock-market-analysis-dev
    
    # Wait for frontend to be ready
    print_status "Waiting for frontend to be ready..."
    sleep 15
    
    print_success "All services started"
}

# Function to check service status
check_status() {
    print_status "Checking service status..."
    echo ""
    docker-compose ps
    echo ""
    
    # Check if services are accessible
    print_status "Testing service accessibility..."
    
    # Test backend
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        print_success "✅ Backend API: http://localhost:3000/ (Healthy)"
    else
        print_error "❌ Backend API: http://localhost:3000/ (Not accessible)"
    fi
    
    # Test frontend
    if curl -f http://localhost:5173/ > /dev/null 2>&1; then
        print_success "✅ Frontend: http://localhost:5173/ (Accessible)"
    else
        print_warning "⚠️  Frontend: http://localhost:5173/ (Still starting up...)"
    fi
}

# Function to show logs
show_logs() {
    print_status "Showing recent logs..."
    echo ""
    docker-compose logs --tail=20
}

# Function to open website in browser
open_website() {
    print_status "Opening website in default browser..."
    
    if command -v open &> /dev/null; then
        # macOS
        open http://localhost:5173/
    elif command -v xdg-open &> /dev/null; then
        # Linux
        xdg-open http://localhost:5173/
    elif command -v start &> /dev/null; then
        # Windows
        start http://localhost:5173/
    else
        print_warning "Could not automatically open browser. Please visit: http://localhost:5173/"
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -c, --clean    Clean up containers and networks before starting"
    echo "  -l, --logs     Show logs after starting services"
    echo "  -o, --open     Open website in browser after starting"
    echo "  -s, --status   Show service status after starting"
    echo "  -a, --all      Clean, start, show status, and open browser"
    echo ""
    echo "Examples:"
    echo "  $0              # Basic launch"
    echo "  $0 -c          # Clean and launch"
    echo "  $0 -a          # Full launch with all features"
    echo "  $0 -l          # Launch and show logs"
}

# Main execution
main() {
    local clean=false
    local show_logs_flag=false
    local open_browser=false
    local show_status=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -c|--clean)
                clean=true
                shift
                ;;
            -l|--logs)
                show_logs_flag=true
                shift
                ;;
            -o|--open)
                open_browser=true
                shift
                ;;
            -s|--status)
                show_status=true
                shift
                ;;
            -a|--all)
                clean=true
                show_status=true
                open_browser=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    echo ""
    print_status "Starting Stock Market Analysis Website..."
    echo ""
    
    # Pre-flight checks
    check_docker
    check_docker_compose
    
    # Clean up if requested
    if [ "$clean" = true ]; then
        cleanup
    fi
    
    # Stop existing services
    stop_services
    
    # Start services
    start_services
    
    # Show status if requested
    if [ "$show_status" = true ]; then
        check_status
    fi
    
    # Show logs if requested
    if [ "$show_logs_flag" = true ]; then
        show_logs
    fi
    
    # Open browser if requested
    if [ "$open_browser" = true ]; then
        open_website
    fi
    
    echo ""
    print_success "🎉 Website launch sequence completed!"
    echo ""
    echo "🌐 Frontend (Development): http://localhost:5173/"
    echo "🔧 Backend (API): http://localhost:3000/"
    echo ""
    echo "📋 Useful commands:"
    echo "  • View logs: docker-compose logs -f"
    echo "  • Check status: docker-compose ps"
    echo "  • Stop services: docker-compose down"
    echo "  • Restart: $0 -c"
    echo ""
    echo "💡 Tip: Use '$0 -a' for full launch with browser opening!"
}

# Run main function with all arguments
main "$@"
