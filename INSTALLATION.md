# 🚀 Stock Market Analysis Installation Guide

## 📋 Quick Start

### Option 1: Automated Installation (Recommended)
```bash
# Install all prerequisites automatically
./install-prerequisites.sh

# Launch the website
./launch-website.sh
```

### Option 2: Manual Installation
```bash
# Check what's already installed
./install-prerequisites.sh --check

# Install missing prerequisites
./install-prerequisites.sh --install

# Verify everything is ready
./install-prerequisites.sh --verify

# Launch the website
./launch-website.sh
```

## 🛠️ Prerequisites Installer

The `install-prerequisites.sh` script automatically installs all required dependencies for your operating system.

### Supported Platforms
- **macOS 10.15+** (Catalina or later)
- **Ubuntu 18.04+** / **Debian 10+**
- **CentOS 7+** / **RHEL 7+**
- **Windows 10+** (WSL2 recommended)

### What Gets Installed
- **Docker Desktop** (4.0+) or **Docker Engine** (20.10+)
- **Docker Compose** (2.0+)
- **Git** (2.0+)
- **Node.js** (16+)
- **npm** (8+)

### Installation Commands

#### Check Current Status
```bash
./install-prerequisites.sh --check
```

#### Show System Requirements
```bash
./install-prerequisites.sh --requirements
```

#### Install All Prerequisites
```bash
./install-prerequisites.sh
```

#### Install Missing Items Only
```bash
./install-prerequisites.sh --install
```

#### Verify Installations
```bash
./install-prerequisites.sh --verify
```

## 🚀 Website Launcher

The `launch-website.sh` script automatically starts Docker and launches all services.

### Features
- **Auto-starts Docker Desktop** if not running
- **Cross-platform support** (macOS, Linux, Windows)
- **Automatic health checks** for all services
- **Cleanup and rebuild options**
- **Browser auto-opening**

### Launch Commands

#### Basic Launch (Auto-starts Docker)
```bash
./launch-website.sh
```

#### Full Launch with All Features
```bash
./launch-website.sh -a
```

#### Clean and Launch
```bash
./launch-website.sh -c
```

#### Deep Cleanup and Launch
```bash
./launch-website.sh -d
```

#### Rebuild and Launch
```bash
./launch-website.sh -r
```

#### Launch and Show Logs
```bash
./launch-website.sh -l
```

#### Launch and Check Status
```bash
./launch-website.sh -s
```

## 📊 System Requirements

### Minimum Requirements
- **Docker Desktop 4.0+** or **Docker Engine 20.10+**
- **Docker Compose 2.0+**
- **Git 2.0+**
- **Node.js 16+**
- **npm 8+**

### Disk Space
- **Docker**: ~2GB
- **Node.js**: ~100MB
- **Project**: ~500MB

### Memory
- **Minimum**: 4GB RAM
- **Recommended**: 8GB+ RAM

## 🔧 Platform-Specific Instructions

### macOS
```bash
# The installer will use Homebrew for installations
./install-prerequisites.sh

# If Homebrew is not installed, it will be installed automatically
```

### Ubuntu/Debian
```bash
# The installer will use apt package manager
./install-prerequisites.sh

# You may need to log out and log back in after Docker installation
```

### CentOS/RHEL/Fedora
```bash
# The installer will use yum package manager
./install-prerequisites.sh

# You may need to log out and log back in after Docker installation
```

### Windows
```bash
# The installer will download Docker Desktop installer
./install-prerequisites.sh

# You'll need to run the installer manually
# WSL2 is recommended for better performance
```

## 🚨 Troubleshooting

### Docker Not Starting
```bash
# Check Docker status
docker info

# If Docker Desktop is not running, the launch script will start it automatically
./launch-website.sh
```

### Permission Issues (Linux)
```bash
# Add user to docker group (if not done automatically)
sudo usermod -aG docker $USER

# Log out and log back in
```

### Port Conflicts
```bash
# Check what's using the ports
lsof -i :3000
lsof -i :5173

# Stop conflicting services or use different ports
```

### Installation Failures
```bash
# Check what failed
./install-prerequisites.sh --check

# Try manual installation for specific components
./install-prerequisites.sh --install
```

## 🎯 Complete Workflow

### First Time Setup
```bash
# 1. Clone the repository
git clone <repository-url>
cd qqq_tqqq_allocation

# 2. Install prerequisites
./install-prerequisites.sh

# 3. Launch the website
./launch-website.sh -a

# 4. Visit the website
# Frontend: http://localhost:5173/
# Backend: http://localhost:3000/
```

### Daily Development
```bash
# Quick start
./launch-website.sh

# Full rebuild and restart
./launch-website.sh -a

# Clean slate
./launch-website.sh -d
```

### Stopping Services
```bash
# Stop all services
docker-compose down

# Stop and remove everything
docker-compose down --volumes --remove-orphans
```

## 📝 Useful Commands

### Service Management
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Restart specific service
docker-compose restart stock-market-analysis-app

# Rebuild specific service
docker-compose build stock-market-analysis-dev
```

### Development Tools
```bash
# Access backend container
docker-compose exec stock-market-analysis-app bash

# Access frontend container
docker-compose exec stock-market-analysis-dev bash

# View database
docker-compose exec stock-market-analysis-app sqlite3 database/stock_data.db
```

## 🎉 Success Indicators

When everything is working correctly, you should see:

### Prerequisites Check
```
✅ Docker is installed
✅ Docker Compose is installed
✅ Git is installed
✅ Node.js is installed
✅ npm is installed
🎉 All prerequisites are installed and ready!
```

### Launch Success
```
🎉 Website launch sequence completed!

🌐 Frontend (Development): http://localhost:5173/
🔧 Backend (API): http://localhost:3000/
```

### Service Health
```
Name                           Command               State           Ports
--------------------------------------------------------------------------------
stock-market-analysis-app      node server.js        Up      0.0.0.0:3000->3000/tcp
stock-market-analysis-dev      npm run dev           Up      0.0.0.0:5173->5173/tcp
```

## 🆘 Getting Help

### Check Script Help
```bash
./install-prerequisites.sh --help
./launch-website.sh --help
```

### View Logs
```bash
docker-compose logs -f
```

### Reset Everything
```bash
# Stop all services
docker-compose down

# Remove all containers and volumes
docker-compose down --volumes --remove-orphans

# Clean Docker cache
docker system prune -a

# Reinstall and relaunch
./install-prerequisites.sh
./launch-website.sh -a
```

---

**🎯 Ready to analyze stock market data? Start with `./install-prerequisites.sh` and `./launch-website.sh`!**
