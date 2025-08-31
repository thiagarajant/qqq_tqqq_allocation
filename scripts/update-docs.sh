#!/bin/bash

# Documentation Update Script for Stock Market Analysis Project
# This script helps maintain consistency across all README files

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}📚 Stock Market Analysis - Documentation Update Script${NC}"
echo "=================================================="

# Function to check if file exists
check_file() {
    if [ ! -f "$1" ]; then
        echo -e "${RED}❌ File not found: $1${NC}"
        return 1
    fi
    return 0
}

# Function to update version information
update_versions() {
    echo -e "${YELLOW}🔄 Updating version information...${NC}"
    
    # Get current date
    CURRENT_DATE=$(date +"%B %Y")
    
    # Update main README.md
    if check_file "$PROJECT_ROOT/README.md"; then
        sed -i.bak "s/**Last Updated**: .*/**Last Updated**: $CURRENT_DATE/" "$PROJECT_ROOT/README.md"
        echo -e "${GREEN}✅ Updated main README.md${NC}"
    fi
    
    # Update component READMEs
    for component in frontend backend database; do
        if check_file "$PROJECT_ROOT/$component/README.md"; then
            sed -i.bak "s/**Last Updated**: .*/**Last Updated**: $CURRENT_DATE/" "$PROJECT_ROOT/$component/README.md"
            echo -e "${GREEN}✅ Updated $component/README.md${NC}"
        fi
    done
    
    # Update DOCKER_README.md
    if check_file "$PROJECT_ROOT/DOCKER_README.md"; then
        sed -i.bak "s/**Last Updated**: .*/**Last Updated**: $CURRENT_DATE/" "$PROJECT_ROOT/DOCKER_README.md"
        echo -e "${GREEN}✅ Updated DOCKER_README.md${NC}"
    fi
    
    # Clean up backup files
    find "$PROJECT_ROOT" -name "*.bak" -delete
}

# Function to check documentation consistency
check_consistency() {
    echo -e "${YELLOW}🔍 Checking documentation consistency...${NC}"
    
    # Check for broken internal links
    echo "Checking internal documentation links..."
    
    # Check if all README files reference the correct project name
    PROJECT_NAME="stock_market_analysis"
    OLD_NAME="qqq_tqqq_allocation"
    
    for file in "$PROJECT_ROOT"/*.md "$PROJECT_ROOT"/*/README.md; do
        if [ -f "$file" ]; then
            if grep -q "$OLD_NAME" "$file"; then
                echo -e "${YELLOW}⚠️  Found old project name in: $file${NC}"
            fi
        fi
    done
    
    # Check for consistent version numbers
    echo "Checking version consistency..."
    VERSIONS=$(grep -r "Version.*:" "$PROJECT_ROOT"/*.md "$PROJECT_ROOT"/*/README.md 2>/dev/null | grep -v "node_modules" || true)
    echo "$VERSIONS"
}

# Function to validate documentation structure
validate_structure() {
    echo -e "${YELLOW}🏗️  Validating documentation structure...${NC}"
    
    # Check if all required README files exist
    REQUIRED_FILES=(
        "README.md"
        "frontend/README.md"
        "backend/README.md"
        "database/README.md"
        "DOCKER_README.md"
        "PROJECT_RESTRUCTURING_CONTEXT.md"
        ".cursorrules"
    )
    
    for file in "${REQUIRED_FILES[@]}"; do
        if check_file "$PROJECT_ROOT/$file"; then
            echo -e "${GREEN}✅ Found: $file${NC}"
        else
            echo -e "${RED}❌ Missing: $file${NC}"
        fi
    done
}

# Function to generate documentation summary
generate_summary() {
    echo -e "${YELLOW}📊 Generating documentation summary...${NC}"
    
    echo "Documentation Summary:"
    echo "====================="
    
    # Count lines in each README file
    for file in "$PROJECT_ROOT"/*.md "$PROJECT_ROOT"/*/README.md; do
        if [ -f "$file" ]; then
            LINE_COUNT=$(wc -l < "$file")
            RELATIVE_PATH=$(realpath --relative-to="$PROJECT_ROOT" "$file")
            echo "  $RELATIVE_PATH: $LINE_COUNT lines"
        fi
    done
    
    # Check total documentation size
    TOTAL_LINES=$(find "$PROJECT_ROOT" -name "*.md" -exec wc -l {} + | tail -1 | awk '{print $1}')
    echo "  Total: $TOTAL_LINES lines of documentation"
}

# Function to show help
show_help() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  --update-versions    Update last updated dates in all README files"
    echo "  --check-consistency  Check for documentation consistency issues"
    echo "  --validate-structure Validate that all required README files exist"
    echo "  --generate-summary   Generate a summary of all documentation"
    echo "  --all                Run all checks and updates"
    echo "  --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --update-versions"
    echo "  $0 --check-consistency"
    echo "  $0 --all"
}

# Main script logic
main() {
    case "${1:---all}" in
        --update-versions)
            update_versions
            ;;
        --check-consistency)
            check_consistency
            ;;
        --validate-structure)
            validate_structure
            ;;
        --generate-summary)
            generate_summary
            ;;
        --all)
            echo -e "${BLUE}🚀 Running all documentation checks and updates...${NC}"
            update_versions
            check_consistency
            validate_structure
            generate_summary
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}🎉 Documentation maintenance completed!${NC}"
}

# Run main function with all arguments
main "$@"
