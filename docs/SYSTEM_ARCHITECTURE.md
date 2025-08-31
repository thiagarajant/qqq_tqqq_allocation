# 🏗️ Stock Market Analysis - System Architecture Overview

## 🎯 **High-Level System Architecture**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STOCK MARKET ANALYSIS                            │
│                              Web Application                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   FRONTEND      │    │    BACKEND      │    │    DATABASE     │
│   (React)       │◄──►│   (Express.js)  │◄──►│   (SQLite)     │
│   Port: 5173    │    │   Port: 3000    │    │   File-based    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Components    │    │   API Routes    │    │   Data Tables   │
│   • Dashboard   │    │   • Symbols     │    │   • Symbols     │
│   • Cycles      │    │   • Cycles      │    │   • Prices      │
│   • Simulation  │    │   • Charts      │    │   • Cycles      │
│   • Portfolio   │    │   • Simulation  │    │   • Metadata    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔄 **Data Flow Architecture**

```
User Input → Frontend → Backend API → Database → External APIs
    ↓           ↓          ↓           ↓           ↓
  Symbol    React App   Express.js   SQLite    Stooq/SEC
  (TSLA)    Components   Routes      Tables    Market Data
    ↓           ↓          ↓           ↓           ↓
  UPPERCASE  State Mgmt  Validation  Queries    Data Fetch
    ↓           ↓          ↓           ↓           ↓
  Search     Contexts    Services    Results    Normalized
  Results    Hooks       Middleware  JSON       Data
    ↓           ↓          ↓           ↓           ↓
  Display    UI Render   Response    Cache      Storage
```

## 🐳 **Docker Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Compose Environment                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              stock-market-analysis-network              │   │
│  │                    (Bridge Driver)                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                │
│                              ▼                                │
│  ┌─────────────────┐    ┌─────────────────┐                  │
│  │   Frontend      │    │    Backend      │                  │
│  │   Container     │    │   Container     │                  │
│  │                 │    │                 │                  │
│  │ • Vite Server   │    │ • Express.js    │                  │
│  │ • React App     │    │ • SQLite DB     │                  │
│  │ • Hot Reload    │    │ • Health Check  │                  │
│  │ • Port 5173     │    │ • Port 3000     │                  │
│  └─────────────────┘    └─────────────────┘                  │
│           │                       │                           │
│           ▼                       ▼                           │
│  ┌─────────────────┐    ┌─────────────────┐                  │
│  │   Volumes       │    │   Volumes       │                  │
│  │                 │    │                 │                  │
│  │ • Source Code   │    │ • Database      │                  │
│  │ • Node Modules  │    │ • Logs          │                  │
│  │ • Hot Reload    │    │ • Persistence   │                  │
│  └─────────────────┘    └─────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

## 🗄️ **Database Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                    SQLite Database Schema                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │    SYMBOLS      │    │ HISTORICAL_     │    │   CYCLES    │ │
│  │                 │    │   PRICES        │    │             │ │
│  │ • symbol (PK)   │    │                 │    │ • id (PK)   │ │
│  │ • name          │    │ • id (PK)       │    │ • symbol    │ │
│  │ • sector        │    │ • symbol (FK)   │    │ • severity  │ │
│  │ • market_cap    │    │ • date          │    │ • ath_date  │ │
│  │ • exchange      │    │ • open/high/    │    │ • ath_price │ │
│  │ • is_active     │    │   low/close     │    │ • low_date  │ │
│  │ • timestamps    │    │ • volume        │    │ • low_price │ │
│  └─────────────────┘    │ • timestamps    │    │ • recovery  │ │
│           │              └─────────────────┘    │ • threshold │ │
│           │                       │              └─────────────┘ │
│           │                       │                      │      │
│           └───────────────────────┼──────────────────────┘      │
│                                   ▼                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │   MARKET_DATA   │    │   VIEWS &       │    │  INDEXES    │ │
│  │   FRESHNESS     │    │   TRIGGERS      │    │             │ │
│  │                 │    │                 │    │ • symbol    │ │
│  │ • symbol (PK)   │    │ • latest_prices │    │ • date      │ │
│  │ • latest_date   │    │ • price_stats   │    │ • sector    │ │
│  │ • days_old      │    │ • cycle_summary │    │ • exchange  │ │
│  │ • last_updated  │    │ • data_freshness│    │ • composite │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🔌 **API Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Endpoints                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │   SYMBOLS API   │    │   CYCLES API    │    │ CHARTS API  │ │
│  │                 │    │                 │    │             │ │
│  │ GET /symbols    │    │ GET /cycles/    │    │ GET /chart- │ │
│  │ GET /symbols/:  │    │   :threshold/:  │    │   data/:    │ │
│  │   symbol        │    │   :symbol       │    │   threshold │ │
│  │ GET /symbols?   │    │ GET /summary/   │    │   /:symbol  │ │
│  │   query=:query  │    │   :threshold/:  │    │ GET /avail- │ │
│  └─────────────────┘    │   :symbol       │    │   able-etfs │ │
│           │              └─────────────────┘    └─────────────┘ │
│           │                       │                      │      │
│           ▼                       ▼                      ▼      │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │ SIMULATION API  │    │ DATA FETCH API  │    │ HEALTH API  │ │
│  │                 │    │                 │    │             │ │
│  │ POST /simulation│    │ POST /fetch-    │    │ GET /health │ │
│  │ POST /smart-    │    │   single-etf    │    │ GET /status │ │
│  │   strategy      │    │ POST /fetch-    │    │ GET /metrics│ │
│  │ POST /portfolio │    │   historical-   │    │ GET /logs   │ │
│  └─────────────────┘    │   data/:symbol  │    └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## ⚛️ **Frontend Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                      React Application                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │     PAGES       │    │   COMPONENTS    │    │  CONTEXTS   │ │
│  │                 │    │                 │    │             │ │
│  │ • Dashboard     │    │ • Navbar        │    │ • ETF       │ │
│  │ • Cycles        │    │ • SymbolSearch  │    │ • Threshold │ │
│  │ • Simulation    │    │ • PriceChart    │    │ • Data      │ │
│  │ • Portfolio     │    │ • CycleTable    │    │ • User      │ │
│  │ • Settings      │    │ • SimulationForm│    │ • Theme     │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
│           │                       │                      │      │
│           ▼                       ▼                      ▼      │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │     HOOKS       │    │   UTILITIES     │    │  LIBRARIES  │ │
│  │                 │    │                 │    │             │ │
│  │ • useETF        │    │ • API Calls     │    │ • Recharts  │ │
│  │ • useThreshold  │    │ • Data Process  │    │ • Framer    │ │
│  │ • useData       │    │ • Chart Helpers │    │   Motion    │ │
│  │ • useSymbols    │    │ • Formatting    │    │ • Tailwind  │ │
│  │ • useSimulation │    │ • Validation    │    │ • React     │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 **Backend Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                     Express.js Server                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │   ENTRY POINT   │    │    ROUTES       │    │  SERVICES   │ │
│  │                 │    │                 │    │             │ │
│  │ • server.js     │    │ • symbols.js    │    │ • Symbol    │ │
│  │ • Port Config   │    │ • cycles.js     │    │ • Cycle     │ │
│  │ • DB Connect    │    │ • charts.js     │    │ • Chart     │ │
│  │ • Middleware    │    │ • simulation.js │    │ • Simulation│ │
│  │ • Error Handler │    │ • health.js     │    │ • DataFetch │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
│           │                       │                      │      │
│           ▼                       ▼                      ▼      │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │   MIDDLEWARE    │    │   DATABASE      │    │ EXTERNAL    │ │
│  │                 │    │                 │    │ INTEGRATION │ │
│  │ • CORS          │    │ • SQLite3       │    │ • Stooq API │ │
│  │ • Helmet        │    │ • Connection    │    │ • SEC API   │ │
│  │ • Compression   │    │ • Queries       │    │ • Market    │ │
│  │ • Validation    │    │ • Transactions  │    │   Data      │ │
│  │ • Rate Limiting │    │ • Migrations    │    │ • Webhooks  │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 **Development Workflow**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐
│   CODE CHANGE   │    │   HOT RELOAD    │    │ LIVE TEST   │
│                 │    │                 │    │             │
│ • Edit File     │───►│ • Vite Detect   │───►│ • Browser   │
│ • Save Changes  │    │ • Rebuild       │    │ • Test UI   │
│ • TypeScript    │    │ • Fast Refresh  │    │ • Check API │
│ • ESLint Check  │    │ • State Preserve│    │ • Validate  │
└─────────────────┘    └─────────────────┘    └─────────────┘
         │                       │                      │
         ▼                       ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐
│   CONTAINER     │    │   QUALITY       │    │  DEPLOY     │
│   ENVIRONMENT   │    │   ASSURANCE     │    │             │
│                 │    │                 │    │             │
│ • Docker Compose│    │ • ESLint        │    │ • Build     │
│ • Volume Mounts │    │ • Prettier      │    │ • Test      │
│ • Hot Reload    │    │ • Type Check    │    │ • Deploy    │
│ • Network       │    │ • Unit Tests    │    │ • Monitor   │
└─────────────────┘    └─────────────────┘    └─────────────┘
```

## 📊 **Performance & Scalability**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Performance Considerations                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │   DATABASE      │    │      API        │    │  FRONTEND   │ │
│  │                 │    │                 │    │             │ │
│  │ • Indexes       │    │ • Caching       │    │ • Code      │ │
│  │ • Views         │    │ • Compression   │    │   Splitting │ │
│  │ • Connection    │    │ • Pagination    │    │ • Lazy      │ │
│  │   Pooling       │    │ • Rate Limiting │    │   Loading   │ │
│  │ • Query         │    │ • Response      │    │ • Memoization│ │
│  │   Optimization  │    │   Optimization  │    │ • Virtual   │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🛡️ **Security Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                       Security Layers                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │   INPUT         │    │   DATABASE      │    │   NETWORK   │ │
│  │                 │    │                 │    │             │ │
│  │ • Validation    │    │ • SQL Injection │    │ • CORS      │ │
│  │ • Sanitization  │    │   Prevention    │    │ • HTTPS     │ │
│  │ • Type Checking │    │ • Parameterized │    │ • Headers   │ │
│  │ • Rate Limiting │    │   Queries       │    │ • Firewall  │ │
│  │ • XSS Prevention│    │ • Access Control│    │ • Monitoring│ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 **Key Features Summary**

### **🎯 Core Functionality**
- **Stock Symbol Search** with real-time suggestions
- **Price Chart Visualization** with multiple timeframes
- **Cycle Analysis** for drawdown detection
- **Portfolio Simulation** with strategy testing
- **Smart Strategy** recommendations

### **🔧 Technical Features**
- **Docker Containerization** for consistent environments
- **Hot Reload Development** for rapid iteration
- **TypeScript** for type safety
- **SQLite Database** for data persistence
- **RESTful API** for data access
- **Responsive UI** with Tailwind CSS

### **📊 Data Sources**
- **Stooq API** for market data
- **SEC Database** for company information
- **Local Database** for caching and analysis
- **Real-time Updates** for current prices

---

*This architecture overview provides a high-level understanding of the Stock Market Analysis system. For detailed technical specifications, refer to the comprehensive architecture diagrams in `ARCHITECTURE_DIAGRAMS.md`.*
