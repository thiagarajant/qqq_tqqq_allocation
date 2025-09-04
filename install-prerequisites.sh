#!/bin/bash

# 🛠️ Stock Market Analysis Prerequisites Installer
# This script installs Docker and other required dependencies

set -e  # Exit on any error

echo "🛠️ Stock Market Analysis Prerequisites Installer"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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

print_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

print_note() {
    echo -e "${CYAN}[NOTE]${NC} $1"
}

# Function to detect operating system
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "msys"* ]] || [[ "$OSTYPE" == "cygwin"* ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if Docker is installed
check_docker_installed() {
    if command_exists docker; then
        return 0
    else
        return 1
    fi
}

# Function to check if Docker Compose is installed
check_docker_compose_installed() {
    if command_exists docker-compose; then
        return 0
    else
        return 1
    fi
}

# Function to check if Git is installed
check_git_installed() {
    if command_exists git; then
        return 0
    else
        return 1
    fi
}

# Function to check if Node.js is installed
check_nodejs_installed() {
    if command_exists node; then
        return 0
    else
        return 1
    fi
}

# Function to check if npm is installed
check_npm_installed() {
    if command_exists npm; then
        return 0
    else
        return 1
    fi
}

# Function to install Docker on macOS
install_docker_macos() {
    print_step "Installing Docker Desktop on macOS..."
    
    if ! command_exists brew; then
        print_status "Installing Homebrew first..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        print_success "Homebrew installed"
    fi
    
    print_status "Installing Docker Desktop via Homebrew..."
    brew install --cask docker
    
    print_success "Docker Desktop installed via Homebrew"
    print_note "Please start Docker Desktop from Applications folder"
    print_note "You may need to grant permissions in System Preferences > Security & Privacy"
}

# Function to install Docker on Linux
install_docker_linux() {
    print_step "Installing Docker on Linux..."
    
    # Detect Linux distribution
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        print_error "Could not detect Linux distribution"
        exit 1
    fi
    
    print_status "Detected OS: $OS $VER"
    
    # Ubuntu/Debian
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
        print_status "Installing Docker on Ubuntu/Debian..."
        
        # Update package index
        sudo apt-get update
        
        # Install prerequisites
        sudo apt-get install -y \
            apt-transport-https \
            ca-certificates \
            curl \
            gnupg \
            lsb-release
        
        # Add Docker's official GPG key
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
        
        # Set up stable repository
        echo \
            "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
            $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        
        # Install Docker Engine
        sudo apt-get update
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io
        
        # Install Docker Compose
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        
        # Add user to docker group
        sudo usermod -aG docker $USER
        
        print_success "Docker installed on Ubuntu/Debian"
        print_note "Please log out and log back in for group changes to take effect"
        
    # CentOS/RHEL/Fedora
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]] || [[ "$OS" == *"Fedora"* ]]; then
        print_status "Installing Docker on CentOS/RHEL/Fedora..."
        
        # Install prerequisites
        sudo yum install -y yum-utils
        
        # Set up repository
        sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        
        # Install Docker Engine
        sudo yum install -y docker-ce docker-ce-cli containerd.io
        
        # Start and enable Docker
        sudo systemctl start docker
        sudo systemctl enable docker
        
        # Install Docker Compose
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        
        # Add user to docker group
        sudo usermod -aG docker $USER
        
        print_success "Docker installed on CentOS/RHEL/Fedora"
        print_note "Please log out and log back in for group changes to take effect"
        
    else
        print_error "Unsupported Linux distribution: $OS"
        print_note "Please install Docker manually for your distribution"
        exit 1
    fi
}

# Function to install Docker on Windows
install_docker_windows() {
    print_step "Installing Docker Desktop on Windows..."
    
    print_status "Downloading Docker Desktop for Windows..."
    
    # Download Docker Desktop installer
    DOCKER_URL="https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
    INSTALLER_PATH="/tmp/DockerDesktopInstaller.exe"
    
    if command_exists curl; then
        curl -L -o "$INSTALLER_PATH" "$DOCKER_URL"
    elif command_exists wget; then
        wget -O "$INSTALLER_PATH" "$DOCKER_URL"
    else
        print_error "Neither curl nor wget found. Please download Docker Desktop manually."
        print_note "Visit: https://www.docker.com/products/docker-desktop"
        exit 1
    fi
    
    print_success "Docker Desktop installer downloaded"
    print_note "Please run the installer manually: $INSTALLER_PATH"
    print_note "Or visit: https://www.docker.com/products/docker-desktop"
}

# Function to install Git
install_git() {
    local os=$1
    
    print_step "Installing Git..."
    
    case $os in
        "macos")
            if command_exists brew; then
                brew install git
            else
                print_error "Homebrew not found. Please install Git manually."
                exit 1
            fi
            ;;
        "linux")
            if command_exists apt-get; then
                sudo apt-get update
                sudo apt-get install -y git
            elif command_exists yum; then
                sudo yum install -y git
            else
                print_error "Package manager not found. Please install Git manually."
                exit 1
            fi
            ;;
        "windows")
            print_note "Please install Git manually from: https://git-scm.com/download/win"
            print_note "Or use winget: winget install Git.Git"
            ;;
    esac
    
    print_success "Git installation completed"
}

# Function to install Node.js and npm
install_nodejs() {
    local os=$1
    
    print_step "Installing Node.js and npm..."
    
    case $os in
        "macos")
            if command_exists brew; then
                brew install node
            else
                print_error "Homebrew not found. Please install Node.js manually."
                exit 1
            fi
            ;;
        "linux")
            if command_exists apt-get; then
                # Install Node.js from NodeSource
                curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
                sudo apt-get install -y nodejs
            elif command_exists yum; then
                # Install Node.js from NodeSource
                curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
                sudo yum install -y nodejs
            else
                print_error "Package manager not found. Please install Node.js manually."
                exit 1
            fi
            ;;
        "windows")
            print_note "Please install Node.js manually from: https://nodejs.org/"
            print_note "Or use winget: winget install OpenJS.NodeJS"
            ;;
    esac
    
    print_success "Node.js and npm installation completed"
}

# Function to verify installations
verify_installations() {
    print_step "Verifying installations..."
    
    local all_good=true
    
    # Check Docker
    if check_docker_installed; then
        print_success "✅ Docker is installed"
        docker --version
    else
        print_error "❌ Docker is not installed"
        all_good=false
    fi
    
    # Check Docker Compose
    if check_docker_compose_installed; then
        print_success "✅ Docker Compose is installed"
        docker-compose --version
    else
        print_error "❌ Docker Compose is not installed"
        all_good=false
    fi
    
    # Check Git
    if check_git_installed; then
        print_success "✅ Git is installed"
        git --version
    else
        print_error "❌ Git is not installed"
        all_good=false
    fi
    
    # Check Node.js
    if check_nodejs_installed; then
        print_success "✅ Node.js is installed"
        node --version
    else
        print_error "❌ Node.js is not installed"
        all_good=false
    fi
    
    # Check npm
    if check_npm_installed; then
        print_success "✅ npm is installed"
        npm --version
    else
        print_error "❌ npm is not installed"
        all_good=false
    fi
    
    if [ "$all_good" = true ]; then
        print_success "🎉 All prerequisites are installed and ready!"
        return 0
    else
        print_error "❌ Some prerequisites are missing. Please install them manually."
        return 1
    fi
}

# Function to show system requirements
show_requirements() {
    echo ""
    print_step "System Requirements:"
    echo ""
    echo "📋 Minimum Requirements:"
    echo "  • Docker Desktop 4.0+ or Docker Engine 20.10+"
    echo "  • Docker Compose 2.0+"
    echo "  • Git 2.0+"
    echo "  • Node.js 16+"
    echo "  • npm 8+"
    echo ""
    echo "💾 Disk Space:"
    echo "  • Docker: ~2GB"
    echo "  • Node.js: ~100MB"
    echo "  • Project: ~500MB"
    echo ""
    echo "🖥️ Supported Platforms:"
    echo "  • macOS 10.15+ (Catalina or later)"
    echo "  • Ubuntu 18.04+ / Debian 10+"
    echo "  • CentOS 7+ / RHEL 7+"
    echo "  • Windows 10+ (WSL2 recommended)"
    echo ""
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  -h, --help           Show this help message"
    echo "  -c, --check          Check if prerequisites are installed"
    echo "  -i, --install        Install missing prerequisites"
    echo "  -a, --all            Install all prerequisites (default)"
    echo "  -r, --requirements   Show system requirements"
    echo "  -v, --verify         Verify all installations"
    echo ""
    echo "Examples:"
    echo "  $0                   # Install all prerequisites"
    echo "  $0 -c               # Check what's installed"
    echo "  $0 -i               # Install missing items"
    echo "  $0 -v               # Verify installations"
    echo "  $0 -r               # Show requirements"
    echo ""
}

# Main execution
main() {
    local check_only=false
    local install_only=false
    local verify_only=false
    local show_reqs=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -c|--check)
                check_only=true
                shift
                ;;
            -i|--install)
                install_only=true
                shift
                ;;
            -a|--all)
                install_only=false
                shift
                ;;
            -v|--verify)
                verify_only=true
                shift
                ;;
            -r|--requirements)
                show_reqs=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Show requirements if requested
    if [ "$show_reqs" = true ]; then
        show_requirements
        exit 0
    fi
    
    # Detect OS
    OS=$(detect_os)
    print_status "Detected operating system: $OS"
    
    if [ "$OS" = "unknown" ]; then
        print_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
    
    # Check installations if requested
    if [ "$check_only" = true ]; then
        print_step "Checking installed prerequisites..."
        verify_installations
        exit $?
    fi
    
    # Verify installations if requested
    if [ "$verify_only" = true ]; then
        verify_installations
        exit $?
    fi
    
    # Install prerequisites
    print_step "Installing prerequisites for $OS..."
    
    # Install Docker if not present
    if ! check_docker_installed; then
        case $OS in
            "macos")
                install_docker_macos
                ;;
            "linux")
                install_docker_linux
                ;;
            "windows")
                install_docker_windows
                ;;
        esac
    else
        print_success "Docker is already installed"
    fi
    
    # Install Docker Compose if not present
    if ! check_docker_compose_installed; then
        print_step "Installing Docker Compose..."
        case $OS in
            "macos")
                if command_exists brew; then
                    brew install docker-compose
                else
                    print_note "Please install Docker Compose manually"
                fi
                ;;
            "linux")
                sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
                sudo chmod +x /usr/local/bin/docker-compose
                ;;
            "windows")
                print_note "Docker Compose should be included with Docker Desktop"
                ;;
        esac
    else
        print_success "Docker Compose is already installed"
    fi
    
    # Install Git if not present
    if ! check_git_installed; then
        install_git "$OS"
    else
        print_success "Git is already installed"
    fi
    
    # Install Node.js and npm if not present
    if ! check_nodejs_installed || ! check_npm_installed; then
        install_nodejs "$OS"
    else
        print_success "Node.js and npm are already installed"
    fi
    
    # Final verification
    echo ""
    print_step "Final verification..."
    if verify_installations; then
        echo ""
        print_success "🎉 All prerequisites are installed and ready!"
        echo ""
        print_note "Next steps:"
        echo "  1. Start Docker Desktop (if not already running)"
        echo "  2. Run: ./launch-website.sh"
        echo "  3. Visit: http://localhost:5173/"
        echo ""
    else
        echo ""
        print_error "❌ Some prerequisites failed to install"
        print_note "Please install them manually and run: $0 -v"
        exit 1
    fi
}

# Run main function with all arguments
main "$@"
