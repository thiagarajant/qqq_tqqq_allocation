#!/bin/bash

# Stock Market Analysis Web Application Docker Management Script
# This script provides easy management of the Stock Market Analysis web application using Docker

set -e  # Exit on any error

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
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to check if database exists
check_database() {
    if [ ! -f "./database/market_data.db" ]; then
        print_error "Database file not found at ./database/market_data.db"
        print_error "Please ensure the database file exists before running the container."
        exit 1
    fi
}

# Function to build the Docker image
build_image() {
    print_status "Building Docker image..."
    docker build -t stock-market-analysis-webapp .
    print_success "Docker image built successfully!"
}

# Function to run the container
run_container() {
    print_status "Starting stock analysis web application..."
    docker-compose up -d
    print_success "Container started successfully!"
    print_status "Application is available at: http://localhost:3000"
    print_status "Use 'docker-compose logs -f' to view logs"
}

# Function to stop the container
stop_container() {
    print_status "Stopping container..."
    docker-compose down
    print_success "Container stopped successfully!"
}

# Function to view logs
view_logs() {
    print_status "Showing container logs..."
    docker-compose logs -f
}

# Function to rebuild and restart
rebuild() {
    print_status "Rebuilding and restarting container..."
    docker-compose down
    docker-compose build --no-cache
    docker-compose up -d
    print_success "Container rebuilt and restarted successfully!"
}

# Function to run in development mode
run_dev() {
    print_status "Starting development container..."
    docker-compose --profile dev up -d
    print_success "Development container started successfully!"
    print_status "Backend API available at: http://localhost:3001"
    print_status "Frontend dev server available at: http://localhost:5173"
}

# Function to clean up
cleanup() {
    print_status "Cleaning up Docker resources..."
    docker-compose down --volumes --remove-orphans
    docker image prune -f
    print_success "Cleanup completed!"
}

# Function to show status
show_status() {
    print_status "Container status:"
    docker-compose ps
    echo ""
    print_status "Container logs (last 10 lines):"
    docker-compose logs --tail=10
}

# Function to show help
show_help() {
    echo "Stock Analysis Web Application Docker Management Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  build     Build the Docker image"
    echo "  run       Build and run the container"
    echo "  start     Start the container (if already built)"
    echo "  stop      Stop the container"
    echo "  restart   Restart the container"
    echo "  logs      View container logs"
    echo "  rebuild   Rebuild and restart the container"
    echo "  dev       Run in development mode"
    echo "  status    Show container status and recent logs"
    echo "  cleanup   Clean up Docker resources"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 run      # Build and run the application"
    echo "  $0 dev      # Run in development mode"
    echo "  $0 logs     # View logs"
    echo "  $0 stop     # Stop the application"
}

# Main script logic
case "${1:-help}" in
    "build")
        check_docker
        build_image
        ;;
    "run")
        check_docker
        check_database
        build_image
        run_container
        ;;
    "start")
        check_docker
        check_database
        run_container
        ;;
    "stop")
        check_docker
        stop_container
        ;;
    "restart")
        check_docker
        check_database
        stop_container
        run_container
        ;;
    "logs")
        check_docker
        view_logs
        ;;
    "rebuild")
        check_docker
        check_database
        rebuild
        ;;
    "dev")
        check_docker
        check_database
        run_dev
        ;;
    "status")
        check_docker
        show_status
        ;;
    "cleanup")
        check_docker
        cleanup
        ;;
    "help"|*)
        show_help
        ;;
esac
