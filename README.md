# Stock Market Analysis Web Application

A comprehensive, high-performance web application for stock market analysis, portfolio simulation, and drawdown cycle detection with a modern, responsive UI built for both desktop and mobile devices.

## 🚀 **Project Overview**

This application provides sophisticated stock market analysis tools including:
- **Real-time Market Analysis**: Analyze stock drawdown cycles with customizable thresholds (2%, 5%, 10%, 15%, 20%)
- **Portfolio Simulation**: Simulate investment strategies with different symbols and time periods
- **Interactive Charts**: Visualize market cycles with advanced charting capabilities
- **ETF Focus**: Specialized analysis for QQQ, TQQQ, and other major ETFs
- **Historical Data**: Comprehensive historical price data for NASDAQ stocks and ETFs

## 🏗️ **Architecture & Tech Stack**

### **Full-Stack Architecture**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │    Database     │
│   (React + TS)  │◄──►│  (Express.js)   │◄──►│   (SQLite3)     │
│   Port: 5173    │    │   Port: 3000    │    │   (File-based)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Technology Stack**

#### **Frontend (React + TypeScript)**
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5.0 (ultra-fast development)
- **Styling**: Tailwind CSS + Framer Motion
- **Charts**: Recharts (professional charting library)
- **UI Components**: Headless UI + Heroicons + Lucide React
- **State Management**: React Context API
- **Routing**: React Router DOM v6

#### **Backend (Node.js + Express)**
- **Runtime**: Node.js 18+ (Alpine Linux)
- **Framework**: Express.js 4.18+
- **Database**: SQLite3 with optimized indexes
- **Security**: Helmet.js, CORS, compression
- **API**: RESTful endpoints with JSON responses

#### **DevOps & Infrastructure**
- **Containerization**: Docker + Docker Compose
- **Multi-stage Builds**: Optimized production images
- **Health Checks**: Automated health monitoring
- **Volume Mounts**: Persistent data storage
- **Network**: Isolated Docker networks

## 📁 **Project Structure**

```
stock_market_analysis/
├── 📁 frontend/                 # React + TypeScript application
│   ├── 📁 src/
│   │   ├── 📁 components/      # Reusable UI components
│   │   ├── 📁 contexts/        # React context providers
│   │   ├── 📁 pages/           # Main application pages
│   │   ├── 📁 data/            # Static data and types
│   │   ├── App.tsx             # Main application component
│   │   └── main.tsx            # Application entry point
│   ├── package.json            # Frontend dependencies
│   ├── vite.config.ts          # Vite configuration
│   ├── tailwind.config.js      # Tailwind CSS configuration
│   └── tsconfig.json           # TypeScript configuration
├── 📁 backend/                  # Express.js API server
│   ├── server.js               # Main server file
│   ├── package.json            # Backend dependencies
│   └── 📁 routes/              # API route handlers
├── 📁 database/                 # Database files and migrations
│   ├── market_data.db          # Main SQLite database
│   ├── market_data_backup.db   # Database backup
│   └── 📁 migrations/          # Database schema migrations
├── 📁 logs/                     # Application logs
├── docker-compose.yml           # Docker orchestration
├── Dockerfile                   # Multi-stage Docker build
├── package.json                 # Root project configuration
└── .gitignore                   # Git ignore rules
```

## 🚀 **Quick Start**

### **Prerequisites**
- Docker & Docker Compose
- Git
- 4GB+ available RAM
- 5GB+ available disk space

### **1. Clone the Repository**
```bash
git clone <repository-url>
cd stock_market_analysis
```

### **2. Start with Docker (Recommended)**
```bash
# Start development environment
docker-compose --profile dev up -d

# Or start production environment
docker-compose up -d
```

### **3. Access the Application**
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health

## 🔧 **Development Setup**

### **Local Development (Node.js Required)**
```bash
# Install dependencies
npm run install-all

# Start development servers
npm run dev

# Or start individually
npm run frontend    # Frontend on port 5173
npm run backend     # Backend on port 3000
```

### **Available Scripts**
```bash
# Development
npm run dev              # Start both frontend and backend
npm run frontend         # Start only frontend
npm run backend          # Start only backend

# Production
npm run build            # Build frontend for production
npm run start            # Start production backend

# Utilities
npm run install-all      # Install all dependencies
```

## 📊 **API Endpoints**

### **Core Endpoints**
- `GET /api/health` - Server health check with database status
- `GET /api/symbols` - Search and retrieve stock symbols
- `GET /api/thresholds` - Available drawdown thresholds
- `GET /api/cycles/:threshold` - Get cycles for specific threshold
- `GET /api/summary/:threshold` - Get summary statistics
- `GET /api/chart-data/:threshold` - Get chart data for visualization
- `POST /api/analyze` - Generate new analysis for custom threshold

### **Example API Usage**
```javascript
// Health check
const health = await fetch('/api/health')
const status = await health.json()

// Search symbols
const symbols = await fetch('/api/symbols?query=AAPL&limit=10')
const data = await symbols.json()

// Get cycles for 5% threshold
const cycles = await fetch('/api/cycles/5')
const cyclesData = await cycles.json()
```

## 🎨 **Frontend Features**

### **Pages & Components**
1. **Dashboard** - Main overview with charts and quick actions
2. **Analysis** - Detailed stock analysis and metrics
3. **Cycles** - Drawdown cycle visualization and analysis
4. **Simulation** - Portfolio simulation and backtesting

### **UI/UX Features**
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Interactive Charts**: Professional charts with Recharts
- **Smooth Animations**: Framer Motion for micro-interactions
- **Dark/Light Mode**: Theme switching capability
- **Real-time Updates**: Live data refresh and updates

### **State Management**
- **ETF Context**: Manages selected ETF and related data
- **Threshold Context**: Handles drawdown threshold selection
- **Data Context**: Manages API data and caching

## 🗄️ **Database Schema**

### **Core Tables**
- **`symbols`**: Stock symbols with metadata (sector, market cap, exchange)
- **`historical_prices`**: Daily OHLCV price data for all symbols
- **`data_freshness`**: Tracks data update status and errors

### **Views & Indexes**
- **`latest_prices`**: Most recent price for each symbol
- **`price_statistics`**: Aggregated price statistics per symbol
- **Optimized indexes** for fast symbol and date queries

### **Data Sources**
- **Primary**: Stooq.com bulk data downloads
- **Fallback**: Individual symbol API calls
- **Coverage**: NASDAQ stocks + Major ETFs

## 🐳 **Docker Configuration**

### **Services**
1. **`stock-market-analysis-app`**: Production full-stack application
2. **`stock-market-analysis-dev`**: Development frontend with hot reload

### **Port Mappings**
- **Frontend Dev**: 5173:5173 (Vite dev server)
- **Backend**: 3000:3000 (Express API)
- **Backend Dev**: 3001:3000 (Development backend)

### **Volumes**
- **Database**: Persistent SQLite storage
- **Logs**: Application log files
- **Source Code**: Hot reload for development

## 📈 **Performance Features**

### **Frontend Optimization**
- **Code Splitting**: Automatic chunk optimization
- **Lazy Loading**: Components load on demand
- **Bundle Optimization**: Tree shaking and dead code elimination
- **Fast Refresh**: Vite HMR for instant updates

### **Backend Optimization**
- **Compression**: Gzip compression for API responses
- **Database Indexes**: Optimized SQLite queries
- **Connection Pooling**: Efficient database connections
- **Caching**: Smart data caching strategies

### **Database Performance**
- **Indexed Queries**: Fast symbol and date lookups
- **Optimized Views**: Pre-computed aggregations
- **Efficient Storage**: SQLite3 with proper schema design

## 🔒 **Security Features**

- **Helmet.js**: Security headers and protection
- **CORS Configuration**: Controlled cross-origin access
- **Input Validation**: Sanitized API inputs
- **SQL Injection Protection**: Parameterized queries
- **Rate Limiting**: API request throttling ready

## 🚨 **Important Notes**

### **Database Files**
- **Large Files**: Database files (4.5GB+) are excluded from Git
- **Persistence**: Data persists across container restarts
- **Backup**: Regular database backups recommended

### **Environment Variables**
- **Development**: Uses development profile in docker-compose
- **Production**: Uses production environment variables
- **Ports**: Configurable via docker-compose.yml

## 🐛 **Troubleshooting**

### **Common Issues**
1. **Port Conflicts**: Check if ports 3000, 3001, or 5173 are in use
2. **Database Errors**: Ensure database directory has proper permissions
3. **Build Failures**: Clear Docker cache with `docker system prune -a`
4. **Memory Issues**: Ensure sufficient RAM for Docker containers

### **Debug Commands**
```bash
# View logs
docker-compose logs -f stock-market-analysis-dev
docker-compose logs -f stock-market-analysis-webapp

# Check container status
docker-compose ps

# Restart services
docker-compose restart stock-market-analysis-dev

# Rebuild containers
docker-compose up --build -d
```

### **Health Checks**
```bash
# Backend health
curl http://localhost:3000/api/health

# Frontend status
curl http://localhost:5173

# Container health
docker-compose ps
```

## 📚 **Additional Documentation**

- **`PROJECT_RESTRUCTURING_CONTEXT.md`**: Complete restructuring history and current status
- **`DOCKER_README.md`**: Detailed Docker setup and configuration
- **`PROJECT_RULES.md`**: Project development guidelines and rules

## 🎯 **Future Enhancements**

- **Real-time Updates**: WebSocket integration for live data
- **Advanced Charts**: More chart types and interactions
- **Export Features**: PDF reports and data exports
- **User Accounts**: Multi-user support and authentication
- **Mobile App**: React Native conversion using shared logic
- **AI Integration**: Machine learning for pattern recognition

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 **Support**

For questions or issues:
- Check the troubleshooting section above
- Review the API documentation
- Open an issue on GitHub
- Check the project context file for current status

---

**Built with ❤️ for stock market analysis enthusiasts**

**Last Updated**: January 2025  
**Status**: ✅ **FULLY OPERATIONAL**  
**Version**: 1.0.0
